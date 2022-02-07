import { User, Map, Match, MatchResult } from "@prisma/client";
import prisma from "./config/prisma";
import redis from "./config/redis";
import { MatchResult as GlickoResult, Period, Player, Rating } from "go-glicko";

import config from "./config/config";
import History from "./history";

const userLeaderboardKey = "quaver:leaderboard:users";
const mapLeaderboardKey = "quaver:leaderboard:maps";
const letterRanks = [
    { rank: "x", rating: 2400 },
    { rank: "u", rating: 2100 },
    { rank: "ss", rating: 1800 },
    { rank: "s+", rating: 1600 },
    { rank: "s", rating: 1400 },
    { rank: "s-", rating: 1200 },
    { rank: "a+", rating: 1100 },
    { rank: "a", rating: 1000 },
    { rank: "a-", rating: 900 },
    { rank: "b+", rating: 800 },
    { rank: "b", rating: 700 },
    { rank: "b-", rating: 650 },
    { rank: "c+", rating: 600 },
    { rank: "c", rating: 575 },
    { rank: "c-", rating: 550 },
    { rank: "d+", rating: 525 },
    { rank: "d", rating: 500 },
];

export default class Ranking {
    // Entities with a match count of this or greater are considered ranked
    static rankedMatchesPlayedUserThreshold = 10;
    static rankedMatchesPlayedMapThreshold = 5;

    public static qrToGlicko(qr: number): number {
        qr = Math.max(0, qr);
        return 1.28 * qr * qr + 500;
    }

    public static glickoToQr(glicko: number): number {
        return Math.sqrt(Math.max(0, glicko - 500) / 1.28);
    }

    public static async getUserRankInformation(user: User) {
        // Unranked
        if (user.matchesPlayed < Ranking.rankedMatchesPlayedUserThreshold) {
            return {
                rank: null,
                letterRank: "z",
                history: [],
            };
        }

        let rank = await redis.zrevrank(userLeaderboardKey, user.userId.toString());

        // This shouldn't usually happen but just in case
        if (!rank) {
            await redis.zadd(userLeaderboardKey, user.rating, user.userId);
            rank = (await redis.zrevrank(userLeaderboardKey, user.userId.toString())) as number;
        }

        let letterRank = "d";
        for (const rank of letterRanks)
            if (user.rating >= rank.rating) {
                letterRank = rank.rank;
                break;
            }

        let history = await History.getUserHistory(user);

        return {
            rank: rank + 1,
            letterRank,
            history,
        };
    }

    public static async getMapRankInformation(map: Map) {
        // Unranked
        if (map.matchesPlayed < Ranking.rankedMatchesPlayedMapThreshold) {
            return {
                rank: null,
                letterRank: "z",
            };
        }

        let rank = await redis.zrevrank(mapLeaderboardKey, map.mapId.toString());

        // This shouldn't usually happen but just in case
        if (!rank) {
            await redis.zadd(mapLeaderboardKey, map.rating, map.mapId);
            rank = (await redis.zrevrank(mapLeaderboardKey, map.mapId.toString())) as number;
        }

        let letterRank = "d";
        for (const rank of letterRanks)
            if (map.rating >= rank.rating) {
                letterRank = rank.rank;
                break;
            }

        let history = await History.getMapHistory(map);

        return {
            rank,
            letterRank,
            history,
        };
    }

    public static async seedUserLeaderboard() {
        const transaction = redis.multi();

        // Clear leaderboard
        // Only adding new users doesn't remove users that became unranked
        transaction.zremrangebyrank(userLeaderboardKey, 0, -1);

        const rankedUsers = await prisma.user.findMany({
            where: {
                matchesPlayed: { gte: Ranking.rankedMatchesPlayedUserThreshold },
                banned: false,
            },
        });

        for (const user of rankedUsers) {
            transaction.zadd(userLeaderboardKey, user.rating, user.userId);
        }

        await transaction.exec();
    }

    public static async seedMapLeaderboard() {
        const transaction = redis.multi();

        // Clear leaderboard
        // Only adding new maps doesn't remove maps that became unranked
        transaction.zremrangebyrank(mapLeaderboardKey, 0, -1);

        const rankedMaps = await prisma.map.findMany({
            where: {
                matchesPlayed: { gte: Ranking.rankedMatchesPlayedMapThreshold },
            },
        });

        for (const map of rankedMaps) {
            transaction.zadd(mapLeaderboardKey, map.rating, `${map.mapId},${map.mapRate}`);
        }

        await transaction.exec();
    }

    // Compute user rating only against the played map
    //
    // Compute all map rates lower than what the player won against as a loss for the maps,
    // or all map rates higher than what the player lost against as a win for the maps
    public static async handleMatchResult(match: Match): Promise<void> {
        if (!["WIN", "RESIGN", "TIMEOUT"].includes(match.result)) return;

        const user = await prisma.user.findUnique({ where: { userId: match.userId } });
        const maps = await prisma.map.findMany({
            where: {
                mapId: match.mapId,
                mapRate: match.result === "WIN" ? { lte: match.mapRate } : { gte: match.mapRate },
            },
        });

        if (!user || maps.length === 0) return;
        const map = match.result === "WIN" ? maps[maps.length - 1] : maps[0];

        const userPlayer = Ranking.computeUserPlayer(user, map, match.result);
        const mapPlayers = Ranking.computeMapPlayers(user, maps, match.result);

        await Ranking.updateUserRating(user, userPlayer);
        for (let i = 0; i < maps.length; i++) {
            await Ranking.updateMapRating(maps[i], mapPlayers[i]);
        }
    }

    private static computeUserPlayer(user: User, map: Map, result: MatchResult): Player {
        const userPlayer = new Player(new Rating(user.rating, user.rd, user.sigma));
        const mapPlayer = new Player(new Rating(map.rating, map.rd, map.sigma));

        let period: Period = new Period(config.tau);

        period.addPlayer(userPlayer);
        period.addPlayer(mapPlayer);

        let outcome = result === "WIN" ? GlickoResult.WIN : GlickoResult.LOSS;
        period.addMatch(userPlayer, mapPlayer, outcome);

        period.Calculate();

        return userPlayer;
    }

    private static computeMapPlayers(user: User, maps: Map[], result: MatchResult): Player[] {
        const userPlayer = new Player(new Rating(user.rating, user.rd, user.sigma));
        const mapPlayers = maps.map((m) => new Player(new Rating(m.rating, m.rd, m.sigma)));

        let period: Period = new Period(config.tau);

        period.addPlayer(userPlayer);
        mapPlayers.forEach((m) => period.addPlayer(m));

        let outcome = result === "WIN" ? GlickoResult.WIN : GlickoResult.LOSS;
        mapPlayers.forEach((m) => period.addMatch(userPlayer, m, outcome));

        period.Calculate();

        return mapPlayers;
    }

    public static async updateAllUserRd(): Promise<void> {
        const results = await prisma.user.findMany({ where: { banned: false } });
        const players = results.map((player) => ({ player, glicko: new Player(new Rating(player.rating, player.rd, player.sigma)) }));

        const period: Period = new Period(config.tau);
        players.forEach((player) => period.addPlayer(player.glicko));
        period.Calculate();

        for (const player of players) await Ranking.updateUserRating(player.player, player.glicko);
    }

    private static async updateUserRating(user: User, userPlayer: Player): Promise<User> {
        console.info(
            [
                `User ${user.userId}`,
                `Rating ${user.rating.toFixed(0)} -> ${userPlayer.Rating().R().toFixed(0)}`,
                `RD ${user.rd.toFixed(0)} -> ${userPlayer.Rating().RD().toFixed(0)}`,
                `Sigma ${user.sigma.toFixed(4)} -> ${userPlayer.Rating().Sigma().toFixed(4)}`,
            ].join(" | ")
        );

        const previousMatchesPlayed = user.matchesPlayed;

        const matches = await prisma.match.findMany({
            where: { userId: user.userId },
            select: { result: true },
        });

        const matchesPlayed = matches.length;
        const wins = matches.filter((match) => match.result === "WIN").length;

        user = await prisma.user.update({
            where: { userId: user.userId },
            data: {
                rating: userPlayer.Rating().R(),
                rd: userPlayer.Rating().RD(),
                sigma: userPlayer.Rating().Sigma(),
                matchesPlayed,
                wins,
            },
        });

        if (user.matchesPlayed >= Ranking.rankedMatchesPlayedUserThreshold) {
            await redis.zadd(userLeaderboardKey, user.rating, user.userId.toString());
        }

        if (user.matchesPlayed > previousMatchesPlayed) {
            await History.createUserDatapoint(user);
        }

        return user;
    }

    private static async updateMapRating(map: Map, mapPlayer: Player, result: boolean | null = null): Promise<Map> {
        console.info(
            [
                `Map ${map.mapId} ${map.mapRate}x`,
                `Rating ${map.rating.toFixed(0)} -> ${mapPlayer.Rating().R().toFixed(0)}`,
                `RD ${map.rd.toFixed(0)} -> ${mapPlayer.Rating().RD().toFixed(0)}`,
                `Sigma ${map.sigma.toFixed(4)} -> ${mapPlayer.Rating().Sigma().toFixed(4)}`,
            ].join(" | ")
        );

        const previousMatchesPlayed = map.matchesPlayed;

        const matches = await prisma.match.findMany({
            where: { mapId: map.mapId, mapRate: map.mapRate },
            select: { result: true },
        });

        const matchesPlayed = matches.length;
        const wins = matches.filter((match) => match.result !== "WIN").length;

        map = await prisma.map.update({
            where: { mapId_mapRate: { mapId: map.mapId, mapRate: map.mapRate } },
            data: {
                rating: mapPlayer.Rating().R(),
                rd: mapPlayer.Rating().RD(),
                sigma: mapPlayer.Rating().Sigma(),
                matchesPlayed,
                wins,
            },
        });

        if (map.matchesPlayed < Ranking.rankedMatchesPlayedMapThreshold) {
            await redis.zadd(mapLeaderboardKey, map.rating, `${map.mapId},${map.mapRate}`);
        }

        if (map.matchesPlayed > previousMatchesPlayed) {
            await History.createMapDatapoint(map);
        }

        return map;
    }
}

import { User, Map, Match, MatchResult } from "@prisma/client";
import prisma from "./config/prisma";
import redis from "./config/redis";
import { MatchResult as GlickoResult, Period, Player, Rating } from "go-glicko";

import config from "./config/config";

const userLeaderboardKey = "quaver:leaderboard:users";
const mapLeaderboardKey = "quaver:leaderboard:maps";
const percentileRanks = [
    { rank: "x", percentile: 0.01 },
    { rank: "u", percentile: 0.05 },
    { rank: "ss", percentile: 0.11 },
    { rank: "s+", percentile: 0.17 },
    { rank: "s", percentile: 0.23 },
    { rank: "s-", percentile: 0.3 },
    { rank: "a+", percentile: 0.38 },
    { rank: "a", percentile: 0.46 },
    { rank: "a-", percentile: 0.54 },
    { rank: "b+", percentile: 0.62 },
    { rank: "b", percentile: 0.7 },
    { rank: "b-", percentile: 0.78 },
    { rank: "c+", percentile: 0.84 },
    { rank: "c", percentile: 0.9 },
    { rank: "c-", percentile: 0.95 },
    { rank: "d+", percentile: 0.975 },
    { rank: "d", percentile: 1.0 },
];

export default class Ranking {
    // Entities with an RD of less than or equal to this value are considered ranked
    static rankedRdThreshold = 100;

    public static qrToGlicko(qr: number): number {
        qr = Math.max(0, qr);
        return 1.28 * qr * qr + 500;
    }

    public static glickoToQr(glicko: number): number {
        return Math.sqrt(Math.max(0, glicko - 500) / 1.28);
    }

    public static async getUserRankInformation(user: User) {
        // Unranked
        if (user.rd > Ranking.rankedRdThreshold) {
            return {
                rank: null,
                percentile: null,
                letterRank: "z",
            };
        }

        let rank = await redis.zrevrank(userLeaderboardKey, user.userId.toString());

        // This shouldn't usually happen but just in case
        if (!rank) {
            await redis.zadd(userLeaderboardKey, user.rating, user.userId);
            rank = (await redis.zrevrank(userLeaderboardKey, user.userId.toString())) as number;
        }

        const count = await redis.zcard(userLeaderboardKey);
        const percentile = count == 1 ? 0.0 : rank / (count - 1);
        let letterRank = "z";
        for (const rank of percentileRanks)
            if (percentile <= rank.percentile) {
                letterRank = rank.rank;
                break;
            }

        return {
            rank: rank + 1,
            percentile,
            letterRank,
        };
    }

    public static async getMapRankInformation(map: Map) {
        // Unranked
        if (map.rd > Ranking.rankedRdThreshold) {
            return {
                rank: null,
                percentile: null,
                letterRank: "z",
            };
        }

        let rank = await redis.zrevrank(mapLeaderboardKey, map.mapId.toString());

        // This shouldn't usually happen but just in case
        if (!rank) {
            await redis.zadd(mapLeaderboardKey, map.rating, map.mapId);
            rank = (await redis.zrevrank(mapLeaderboardKey, map.mapId.toString())) as number;
        }

        const count = await redis.zcard(mapLeaderboardKey);
        const percentile = count == 1 ? 0.0 : rank / (count - 1);
        let letterRank = "z";
        for (const rank of percentileRanks)
            if (percentile <= rank.percentile) {
                letterRank = rank.rank;
                break;
            }

        return {
            rank,
            percentile,
            letterRank,
        };
    }

    public static async seedUserLeaderboard() {
        const transaction = redis.multi();

        // Clear leaderboard
        // Only adding new users doesn't remove users that became unranked
        transaction.zremrangebyrank(userLeaderboardKey, 0, -1);

        const rankedUsers = await prisma.user.findMany({ where: { rd: { lte: Ranking.rankedRdThreshold }, banned: false } });
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

        const rankedMaps = await prisma.map.findMany({ where: { rd: { lte: Ranking.rankedRdThreshold } } });
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

        await Ranking.updateUserRating(user, userPlayer, match.result === "WIN");
        for (let i = 0; i < maps.length; i++) {
            await Ranking.updateMapRating(maps[i], mapPlayers[i], match.result === "WIN");
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

    private static async updateUserRating(user: User, userPlayer: Player, result: boolean | null = null): Promise<User> {
        console.info(
            [
                `User ${user.userId}`,
                `Rating ${user.rating.toFixed(0)} -> ${userPlayer.Rating().R().toFixed(0)}`,
                `RD ${user.rd.toFixed(0)} -> ${userPlayer.Rating().RD().toFixed(0)}`,
                `Sigma ${user.sigma.toFixed(4)} -> ${userPlayer.Rating().Sigma().toFixed(4)}`,
            ].join(" | ")
        );

        user = await prisma.user.update({
            where: { userId: user.userId },
            data: {
                rating: userPlayer.Rating().R(),
                rd: userPlayer.Rating().RD(),
                sigma: userPlayer.Rating().Sigma(),
                matchesPlayed: user.matchesPlayed + (result !== null ? 1 : 0),
                wins: user.wins + (result ? 1 : 0),
            },
        });

        if (user.rd < Ranking.rankedRdThreshold) {
            await redis.zadd(userLeaderboardKey, user.rating, user.userId.toString());
        } else {
            await redis.zrem(userLeaderboardKey, user.userId.toString());
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

        map = await prisma.map.update({
            where: { mapId_mapRate: { mapId: map.mapId, mapRate: map.mapRate } },
            data: {
                rating: mapPlayer.Rating().R(),
                rd: mapPlayer.Rating().RD(),
                sigma: mapPlayer.Rating().Sigma(),
                matchesPlayed: map.matchesPlayed + (result !== null ? 1 : 0),
                wins: map.wins + (result ? 0 : 1),
            },
        });

        if (map.rd < Ranking.rankedRdThreshold) {
            await redis.zadd(mapLeaderboardKey, map.rating, `${map.mapId},${map.mapRate}`);
        } else {
            await redis.zrem(mapLeaderboardKey, `${map.mapId},${map.mapRate}`);
        }

        return map;
    }
}

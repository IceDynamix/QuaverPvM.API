import { User, Map } from "@prisma/client";
import prisma from "./prisma";
import redis from "./redis";

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

        const percentile = rank / (await redis.zcard(userLeaderboardKey));
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

        const percentile = rank / (await redis.zcard(mapLeaderboardKey));
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
}

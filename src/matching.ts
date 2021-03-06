import prisma from "./config/prisma";
import { User, Map, Match, Prisma } from "@prisma/client";
import Ranking from "./ranking";

const matchTimeout = 10 * 60 * 1000; // 10 minutes
const blacklistLastNMaps: number = 10;
const qrMatchWindow: number = 1;

export default class Matching {
    public static async getOngoingMatch(user: User): Promise<Match | null> {
        return await prisma.match.findFirst({
            where: {
                userId: user.userId,
                createdAt: { gte: new Date(new Date().getTime() - matchTimeout) },
                result: "ONGOING",
            },
        });
    }

    public static async matchmaker(user: User): Promise<Match> {
        const ongoing = await Matching.getOngoingMatch(user);
        if (ongoing) return ongoing;

        const map = await Matching.findMapInUserRange(user);
        const match = await prisma.match.create({
            data: {
                mapId: map.mapId,
                mapRate: map.mapRate,
                userId: user.userId,
            },
        });

        setTimeout(async () => {
            await Matching.cleanUpMatch(match);
        }, matchTimeout);

        return match;
    }

    private static async cleanUpMatch(match: Match) {
        const ongoingMatch = await prisma.match.findUnique({ where: { matchId: match.matchId } });
        if (ongoingMatch && ongoingMatch.result == "ONGOING") {
            await prisma.match.update({
                where: { matchId: ongoingMatch.matchId },
                data: { result: "TIMEOUT" },
            });
            await Ranking.handleMatchResult(match);
        }
    }

    public static async cleanUpAllMatches(): Promise<void> {
        const unprocessedTimedOutMatches = await prisma.match.findMany({
            where: {
                createdAt: { lte: new Date(new Date().getTime() - matchTimeout) },
                result: "ONGOING",
            },
        });

        const matchIds = unprocessedTimedOutMatches.map((m) => m.matchId);
        await prisma.match.updateMany({ where: { matchId: { in: matchIds } }, data: { result: "TIMEOUT" } });

        for (const match of unprocessedTimedOutMatches) await Ranking.handleMatchResult(match);
    }

    public static async findMapInUserRange(user: User): Promise<Map> {
        const lastPlayedMapSetIds = (
            await prisma.match.findMany({
                where: {
                    result: { not: "ONGOING" },
                    userId: user.userId,
                },
                orderBy: { createdAt: "desc" },
                take: blacklistLastNMaps,
                include: { map: true },
            })
        ).map((m) => m.map.mapsetId);

        const qr = Ranking.glickoToQr(user.rating);

        let qrRange = qrMatchWindow;
        let foundMap = null;

        while (foundMap === null) {
            const lowerBound = Ranking.qrToGlicko(Math.max(0, qr - qrRange));
            const upperBound = Ranking.qrToGlicko(Math.max(2 * qrMatchWindow, qr + qrRange));

            let filter: Prisma.MapWhereInput = {
                rating: {
                    gte: lowerBound,
                    lte: upperBound,
                },
                mapsetId: { notIn: lastPlayedMapSetIds },
            };

            if (user.rating < 1400) {
                filter = { ...filter, mapRate: 1.0 };
            }

            const mapsInRange = await prisma.map.findMany({ where: filter });

            if (mapsInRange.length === 0) {
                qrRange += 1;
            } else {
                const randomIndex = Math.round((mapsInRange.length - 1) * Math.random());
                foundMap = mapsInRange[randomIndex];
            }
        }

        return foundMap;
    }

    public static async findMapInRatingRange(min: number, max: number): Promise<Map | null> {
        const mapsInRange = await prisma.map.findMany({
            where: {
                rating: {
                    gte: min,
                    lte: max,
                },
            },
        });

        if (mapsInRange.length === 0) return null;

        const randomIndex = Math.round((mapsInRange.length - 1) * Math.random());
        return mapsInRange[randomIndex];
    }
}

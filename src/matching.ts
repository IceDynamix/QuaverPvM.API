import prisma from "./config/prisma";
import { User, Map, Match } from "@prisma/client";
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

        const map = await Matching.findMapInRange(user);
        const match = await prisma.match.create({
            data: {
                mapId: map.mapId,
                mapRate: map.mapRate,
                userId: user.userId,
            },
        });

        setTimeout(Matching.cleanUpMatch(match), matchTimeout);

        return match;
    }

    private static cleanUpMatch(match: Match): (match: Match) => void {
        return async () => {
            const ongoingMatch = await prisma.match.findUnique({ where: { matchId: match.matchId } });
            if (ongoingMatch && ongoingMatch.result == "ONGOING") {
                prisma.match.update({
                    where: { matchId: ongoingMatch.matchId },
                    data: { result: "TIMEOUT" },
                });
                // TODO: Handle loss
            }
        };
    }

    public static async cleanUpAllMatches(): Promise<void> {
        await prisma.match.updateMany({
            where: {
                createdAt: { gte: new Date(new Date().getTime() - matchTimeout) },
                result: "ONGOING",
            },
            data: { result: "TIMEOUT" },
        });
    }

    public static async findMapInRange(user: User): Promise<Map> {
        const lastPlayedMapIds = (
            await prisma.match.findMany({
                where: {
                    result: { not: "ONGOING" },
                    userId: user.userId,
                },
                orderBy: { createdAt: "desc" },
                take: blacklistLastNMaps,
                select: { mapId: true },
            })
        ).map((m) => m.mapId);

        const qr = Ranking.glickoToQr(user.rating);

        // Ensures the window is always large enough
        const lowerBound = Ranking.qrToGlicko(Math.max(0, qr - qrMatchWindow));
        const upperBound = Ranking.qrToGlicko(Math.max(2 * qrMatchWindow, qr + qrMatchWindow));

        const mapsInRange = await prisma.map.findMany({
            where: {
                rating: {
                    gte: lowerBound,
                    lte: upperBound,
                },
                mapId: { notIn: lastPlayedMapIds },
            },
        });

        if (mapsInRange.length === 0) throw `No maps in range ${lowerBound}-${upperBound}`;

        const randomIndex = Math.round((mapsInRange.length - 1) * Math.random());
        if (mapsInRange[randomIndex] == undefined) {
            console.log(mapsInRange.length);
            console.log(randomIndex);
        }

        return mapsInRange[randomIndex];
    }
}
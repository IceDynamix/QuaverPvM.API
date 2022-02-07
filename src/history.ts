import { User, Map, Prisma } from "@prisma/client";
import prisma from "./config/prisma";
import Ranking from "./ranking";

class History {
    public static async createUserDatapoints() {
        const users = await prisma.user.findMany({ where: { banned: false, matchesPlayed: { gt: 0 } } });
        const userDatapoints = users.map((u) => History.userToDatapoint(u));
        await prisma.userHistory.createMany({ data: userDatapoints });
    }

    public static async createMapDatapoints() {
        const maps = await prisma.map.findMany({ where: { matchesPlayed: { gt: 0 } } });
        const mapDatapoints = maps.map((u) => History.mapToDatapoint(u));
        await prisma.mapHistory.createMany({ data: mapDatapoints });
    }

    public static async createUserDatapoint(user: User) {
        const data = History.userToDatapoint(user);
        await prisma.userHistory.create({ data });
    }

    public static async createMapDatapoint(map: Map) {
        const data = History.mapToDatapoint(map);
        await prisma.mapHistory.create({ data });
    }

    private static userToDatapoint(user: User): Prisma.UserHistoryCreateManyInput {
        return {
            userId: user.userId,
            rating: user.rating,
            rd: user.rd,
            wins: user.wins,
            matchesPlayed: user.matchesPlayed,
        };
    }

    private static mapToDatapoint(map: Map): Prisma.MapHistoryCreateManyInput {
        return {
            mapId: map.mapId,
            mapRate: map.mapRate,
            rating: map.rating,
            rd: map.rd,
            wins: map.wins,
            matchesPlayed: map.matchesPlayed,
        };
    }

    public static async getUserHistory(user: User) {
        return await prisma.userHistory.findMany({
            where: {
                userId: user.userId,
            },
            take: 50,
            orderBy: { timestamp: "desc" },
        });
    }

    public static async getMapHistory(map: Map) {
        return await prisma.mapHistory.findMany({
            where: {
                mapId: map.mapId,
                mapRate: map.mapRate,
            },
            take: 50,
            orderBy: { timestamp: "desc" },
        });
    }
}

export default History;

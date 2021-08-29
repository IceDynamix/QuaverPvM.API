import { User, Map, Prisma } from "@prisma/client";
import prisma from "./config/prisma";

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
}

export default History;

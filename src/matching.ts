import prisma from "./config/prisma";
import { User, Match } from "@prisma/client";

const matchTimeout = 10 * 60 * 1000; // 10 minutes

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
}

import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";

const pageSize = 50;

export default class LeaderboardController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { page, full } = req.query;

        const pageNumber = page ? Math.max(parseInt(page.toString()), 0) : 0;

        let filter;
        if (full) filter = { matchesPlayed: { gte: 10 }, banned: false };
        else filter = { rd: { lte: Ranking.rankedRdThreshold }, banned: false };

        let results = await prisma.user.findMany({
            where: filter,
            orderBy: { rating: "desc" },
            skip: pageSize * pageNumber,
            take: pageSize,
        });

        for (const result of results) {
            const rankInformation = await Ranking.getUserRankInformation(result);
            Object.assign(result, rankInformation);
        }

        res.json(results);
    }
}

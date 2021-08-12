import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";

const pageSize = 50;

export default class LeaderboardController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { page } = req.query;

        const pageNumber = page ? Math.max(parseInt(page.toString()), 0) : 0;
        let results = await prisma.user.findMany({
            where: { rd: { lte: Ranking.rankedRdThreshold }, banned: false },
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

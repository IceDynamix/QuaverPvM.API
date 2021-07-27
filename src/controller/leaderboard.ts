import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";

const pageSize = 50;

export default class LeaderboardController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { page } = req.query;

        const pageNumber = page ? Math.max(parseInt(page.toString()), 0) : 0;
        let result = await prisma.user.findMany({
            where: { rd: { lte: Ranking.rankedRdThreshold }, banned: false },
            orderBy: { rating: "desc" },
            skip: pageSize * pageNumber,
            take: pageSize,
        });
        res.json(result);
    }
}

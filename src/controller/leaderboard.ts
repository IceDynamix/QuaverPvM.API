import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";

const pageSize = 50;

export default class LeaderboardController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { page, full } = req.query;

        const pageNumber = page ? Math.max(parseInt(page.toString()), 0) : 0;

        let filter;
        if (full == "true") filter = { banned: false };
        else filter = { matchesPlayed: { gte: Ranking.rankedMatchesPlayedUserThreshold }, banned: false };

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

    public static async mapGET(req: Request, res: Response, next: Function) {
        const { page, full, allrates } = req.query;

        const pageNumber = page ? Math.max(parseInt(page.toString()), 0) : 0;

        let filter = {};
        if (!full) filter = { ...filter, matchesPlayed: { gte: Ranking.rankedMatchesPlayedMapThreshold } };
        if (!allrates) filter = { ...filter, mapRate: 1.0 };

        let results = await prisma.map.findMany({
            where: filter,
            orderBy: { rating: "desc" },
            skip: pageSize * pageNumber,
            take: pageSize,
        });

        for (const result of results) {
            const rankInformation = await Ranking.getMapRankInformation(result);
            Object.assign(result, rankInformation);
        }

        res.json(results);
    }
}

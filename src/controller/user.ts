import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";

const pageSize = 50;

export default class UserController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id } = req.query;
        if (!id) return res.json(null);

        const userId = parseInt(id.toString());
        let result = await prisma.user.findUnique({ where: { userId } });
        if (!result || result.banned === true) {
            res.json(null);
        } else {
            const rankInformation = await Ranking.getUserRankInformation(result);
            Object.assign(result, rankInformation);
            res.json(result);
        }
    }

    public static async selfGET(req: Request, res: Response, next: Function) {
        const user = req.user!;
        if (user.banned === true) return res.json(null);
        const rankInformation = await Ranking.getUserRankInformation(user);
        Object.assign(user, rankInformation);
        res.json(user);
    }

    public static async userMatchesGET(req: Request, res: Response, next: Function) {
        const { id, page } = req.query;
        if (!id) return res.json(null);

        const userId = parseInt(id.toString());
        const pageNumber = page ? Math.max(parseInt(page.toString()), 0) : 0;

        let results = await prisma.match.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
            take: pageSize,
            skip: pageSize * pageNumber,
            include: { map: true },
        });

        for (const result of results) Object.assign(result.map, await Ranking.getMapRankInformation(result.map));

        res.json(results);
    }

    public static async userBestWinsGET(req: Request, res: Response, next: Function) {
        const { id, page } = req.query;
        if (!id) return res.json(null);

        const userId = parseInt(id.toString());
        const pageNumber = page ? Math.max(parseInt(page.toString()), 0) : 0;

        let results = await prisma.match.findMany({
            where: { userId, result: "WIN" },
            orderBy: { map: { rating: "desc" } },
            take: pageSize,
            skip: pageSize * pageNumber,
            include: { map: true },
        });

        for (const result of results) Object.assign(result.map, await Ranking.getMapRankInformation(result.map));

        res.json(results);
    }
}

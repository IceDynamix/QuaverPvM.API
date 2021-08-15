import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";

export default class StatsController {
    public static async GET(req: Request, res: Response, next: Function) {
        const userCount = await prisma.user.count({ where: { banned: false } });
        const rankedUserCount = await prisma.user.count({ where: { banned: false, rd: { lte: Ranking.rankedRdThreshold } } });
        const mapCount = await prisma.map.count();
        const rankedMapCount = await prisma.map.count({ where: { rd: { lte: Ranking.rankedRdThreshold } } });
        const matchCount = await prisma.match.count();

        // TODO: Rank Thresholds

        res.json({ userCount, rankedUserCount, mapCount, rankedMapCount, matchCount });
    }
}

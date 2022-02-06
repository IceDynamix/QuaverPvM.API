import { User } from "@prisma/client";
import { Request, Response } from "express";
import prisma from "../config/prisma";
import QuaverApi from "../quaver/quaverApi";
import Ranking from "../ranking";

const pageSize = 50;

export default class UserController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id } = req.query;
        if (!id) return res.json(null);

        const userId = parseInt(id.toString());
        let user = await prisma.user.findUnique({ where: { userId } });

        if (!user || user.banned === true) {
            res.json(null);
        } else {
            const rankInformation = await Ranking.getUserRankInformation(user);
            Object.assign(user, rankInformation);
            res.json(user);
        }
    }

    public static async selfGET(req: Request, res: Response, next: Function) {
        const user = req.user!;
        if (user.banned === true) return res.json(null);

        const quaverData = await QuaverApi.getFullUser(user.userId);
        if ("info" in quaverData && "username" in quaverData.info) {
            const username = quaverData.info.username;
            if (user.username != username) {
                await prisma.user.update({ where: { userId: user.userId }, data: { username } });
            }
        }

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
            distinct: ["mapId", "mapRate"],
        });

        for (const result of results) Object.assign(result.map, await Ranking.getMapRankInformation(result.map));

        res.json(results);
    }

    public static async userSearchGET(req: Request, res: Response, next: Function) {
        const search = req.query.search?.toString();
        if (!search) return res.json(null);

        const quaverResults = await QuaverApi.getUserSearch(search);

        if (quaverResults === null) return res.json(null);
        if (quaverResults.length === 0) return res.json([]);

        const userIds: number[] = quaverResults.map((u: any) => u.id);

        const userResults: User[] = [];

        for (const userId of userIds) {
            const user = await prisma.user.findUnique({ where: { userId } });
            if (user) userResults.push(user);
        }

        for (const user of userResults) Object.assign(user, await Ranking.getUserRankInformation(user));

        return res.json(userResults);
    }
}

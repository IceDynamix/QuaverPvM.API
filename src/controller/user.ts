import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";

export default class UserController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id } = req.query;
        if (!id) {
            res.json(null);
            return;
        }

        const userId = parseInt(id.toString());
        let result = await prisma.user.findUnique({ where: { userId } });
        if (!result) {
            res.json(null);
        } else {
            const rankInformation = await Ranking.getUserRankInformation(result);
            Object.assign(result, rankInformation);
            res.json(result);
        }
    }

    public static async selfGET(req: Request, res: Response, next: Function) {
        const user = req.user;
        if (!user) {
            res.json(null);
        } else {
            const rankInformation = await Ranking.getUserRankInformation(user);
            Object.assign(user, rankInformation);
            res.json(user);
        }
    }
}

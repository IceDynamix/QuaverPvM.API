import { Request, Response } from "express";
import prisma from "../config/prisma";
import Matching from "../matching";

export default class MatchController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id } = req.query;

        if (!id) {
            res.json(null);
            return;
        }

        const matchId = parseInt(id.toString());

        let result = await prisma.match.findUnique({ where: { matchId } });
        res.json(result ? result : null);
    }

    public static async ongoingGET(req: Request, res: Response, next: Function) {
        if (!req.user) {
            res.json(null);
            return;
        }

        res.json(await Matching.getOngoingMatch(req.user));
    }

    public static async newGET(req: Request, res: Response, next: Function) {
        if (!req.user) {
            res.json(null);
            return;
        }

        res.json(await Matching.matchmaker(req.user));
    }
}

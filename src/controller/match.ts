import { Request, Response } from "express";
import prisma from "../config/prisma";
import Matching from "../matching";
import Ranking from "../ranking";
import Submission from "../submission";

export default class MatchController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id } = req.query;
        if (!id) return res.json(null);

        const matchId = parseInt(id.toString());

        let result = await prisma.match.findUnique({ where: { matchId } });
        res.json(result ?? null);
    }

    public static async ongoingGET(req: Request, res: Response, next: Function) {
        const match = await Matching.getOngoingMatch(req.user!);
        if (!match) return res.json(null);

        const map = await prisma.map.findUnique({
            where: {
                mapId_mapRate: {
                    mapId: match.mapId,
                    mapRate: match.mapRate,
                },
            },
        });

        if (map) {
            const rankInformation = await Ranking.getMapRankInformation(map);
            Object.assign(map, rankInformation);
        }

        res.json({ match, map });
    }

    public static async newGET(req: Request, res: Response, next: Function) {
        let match;
        try {
            match = await Matching.matchmaker(req.user!);
        } catch (error) {
            return res.json({ error, message: error.message });
        }

        const map = await prisma.map.findUnique({
            where: {
                mapId_mapRate: {
                    mapId: match.mapId,
                    mapRate: match.mapRate,
                },
            },
        });

        if (map) {
            const rankInformation = await Ranking.getMapRankInformation(map);
            Object.assign(map, rankInformation);
        }

        res.json({ match, map });
    }

    public static async submitPOST(req: Request, res: Response, next: Function) {
        res.json(await Submission.submitMatch(req.user!, req.body.resign ?? false));
    }
}

import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";
import Matching from "../matching";

export default class MapController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id, rate } = req.query;

        if (!id) {
            res.json(null);
            return;
        }

        const mapId = parseInt(id.toString());
        const mapRate = rate ? parseFloat(rate.toString()) : 1.0;

        let result = await prisma.map.findUnique({ where: { mapId_mapRate: { mapId, mapRate } } });
        if (!result) {
            res.json(null);
        } else {
            const rankInformation = await Ranking.getMapRankInformation(result);
            Object.assign(result, rankInformation);
            res.json(result);
        }
    }

    public static async randomGET(req: Request, res: Response, next: Function) {
        const { min, max } = req.query;
        const minValue = min ? parseInt(min?.toString(), 10) : 0;
        const maxValue = max ? parseInt(max.toString(), 10) : 9999;
        if (maxValue < minValue) {
            res.json({});
            return;
        }

        const map = await Matching.findMapInRatingRange(minValue, maxValue);
        if (!map) {
            res.json({});
        } else {
            const rankInformation = await Ranking.getMapRankInformation(map);
            Object.assign(map, rankInformation);
            res.json(map);
        }
    }
}

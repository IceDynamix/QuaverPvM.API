import { Request, Response } from "express";
import prisma from "../config/prisma";
import Ranking from "../ranking";
import Matching from "../matching";
import QuaverApi from "../quaver/quaverApi";
import { Map } from ".prisma/client";

export default class MapController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id, rate, all } = req.query;
        if (!id) return res.json(null);

        const mapId = parseInt(id.toString());

        if (!all) {
            const mapRate = rate ? parseFloat(rate.toString()) : 1.0;

            let result = await prisma.map.findUnique({ where: { mapId_mapRate: { mapId, mapRate } } });
            if (!result) {
                return res.json(null);
            } else {
                const rankInformation = await Ranking.getMapRankInformation(result);
                Object.assign(result, rankInformation);
                return res.json(result);
            }
        } else {
            let results = await prisma.map.findMany({ where: { mapId }, orderBy: { mapRate: "asc" } });

            for (const result of results) {
                const rankInformation = await Ranking.getMapRankInformation(result);
                Object.assign(result, rankInformation);
            }

            return res.json(results);
        }
    }

    public static async randomGET(req: Request, res: Response, next: Function) {
        const { min, max } = req.query;
        const minValue = min ? parseInt(min?.toString(), 10) : 0;
        const maxValue = max ? parseInt(max.toString(), 10) : 9999;
        if (maxValue < minValue) {
            res.json(null);
            return;
        }

        const map = await Matching.findMapInRatingRange(minValue, maxValue);
        if (!map) {
            res.json(null);
        } else {
            const rankInformation = await Ranking.getMapRankInformation(map);
            Object.assign(map, rankInformation);
            res.json(map);
        }
    }

    public static async mapSearchGET(req: Request, res: Response, next: Function) {
        const search = req.query.search?.toString();
        if (!search) return res.json(null);

        const quaverResults = await QuaverApi.getMapSearch(search);

        if (quaverResults === null) return res.json(null);
        if (quaverResults.length === 0) return res.json([]);

        const mapsetIds: number[] = quaverResults.map((u: any) => u.id);

        // Order doesn't matter for mapset search (it's ordered chronologically), so a single
        // database query is used, as opposed to the user search
        const mapResults = await prisma.map.findMany({ where: { mapsetId: { in: mapsetIds }, mapRate: 1.0 } });

        for (const map of mapResults) Object.assign(map, await Ranking.getMapRankInformation(map));

        return res.json(mapResults);
    }
}

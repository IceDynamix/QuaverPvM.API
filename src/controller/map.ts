import { Request, Response } from "express";
import prisma from "../prisma";

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
        res.json(result);
    }
}

import {Request, Response} from "express";
import {EntityDoc, EntityModel} from "../models/entity";

export default class EntityController {
    public static async GET(req: Request, res: Response, next) {
        const {id, type, qid} = req.query;

        let filter: any = {};
        if (id) filter._id = id;
        if (type) filter.entityType = type;
        if (qid) filter.quaverId = qid;

        let result = await EntityModel.find(filter).exec();
        let projectedResults = await Promise.all(result.map(r => r.projectQuaverData()));

        res.json(projectedResults)
    }

    public static async selfGET(req: Request, res: Response, next) {
        let user = null;
        if (req.user) user = await (req.user as EntityDoc).projectQuaverData();
        res.json(user)
    }
}

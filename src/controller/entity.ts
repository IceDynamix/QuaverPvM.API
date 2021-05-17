import {Request, Response} from "express";
import {EntityDoc, EntityModel} from "../models/entity";
import ResponseHandler from "./response";

export default class EntityController {
    public static async GET(req: Request, res: Response) {
        const {id, type, qid} = req.query;

        let filter: any = {};
        if (id) filter._id = id;
        if (type) filter.entityType = type;
        if (qid) filter.quaverId = qid;

        let result = await EntityModel.find(filter).exec();
        let projectedResults = await Promise.all(result.map(r => r.projectQuaverData()));

        await ResponseHandler.handle(projectedResults, res);
    }

    public static async selfGET(req: Request, res: Response) {
        let user = null;
        if (req.user) user = await (req.user as EntityDoc).projectQuaverData();
        await ResponseHandler.handle(user, res, 200);
    }
}

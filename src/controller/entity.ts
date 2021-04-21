import { Request, Response } from "express";
import { EntityModel } from "../models/entity";
import ResponseHandler from "./response";

export default class EntityController {
    public static GET(req: Request, res: Response): void {
        const { id, type, qid } = req.query;

        let filter: any = {};
        if (id) filter._id = id;
        if (type) filter.entityType = type;
        if (qid) filter.quaverId = qid;

        ResponseHandler.handle(EntityModel.find(filter).exec(), res);
    }

    public static createUser(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        ResponseHandler.handle(EntityModel.createNewUser(quaverId), res);
    }

    public static createMap(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        ResponseHandler.handle(EntityModel.createNewMap(quaverId), res);
    }
}

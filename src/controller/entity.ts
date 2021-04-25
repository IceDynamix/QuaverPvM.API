import { Request, Response } from "express";
import { Entity, EntityModel } from "../models/entity";
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

    public static selfGET(req: Request, res: Response): void {
        ResponseHandler.handle(new Promise((resolve) => resolve(req.user ?? null)), res, 200);
    }

    public static connect(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.body.id);
        ResponseHandler.handle(EntityModel.connectUserToQuaver(req.user as Entity, quaverId), res);
    }
}

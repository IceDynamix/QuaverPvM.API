import { Request, Response } from "express";
import config from "../config/config";
import { EntityModel } from "../models/entity";
import ResponseHandler from "./response";

export default class EntityController {
    public static GET(req: Request, res: Response): void {
        const { id, type, qid } = req.query;

        let filter: any = {};
        if (id) filter._id = id;
        if (type) filter.entityType = type;
        if (qid) filter.quaverId = qid;

        ResponseHandler.handle(EntityModel.find(filter).exec(), req, res);
    }

    public static selfGET(req: Request, res: Response): void {
        ResponseHandler.handle(new Promise((resolve) => resolve(req.user ?? null)), req, res, 200, true);
    }

    public static createUser(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        ResponseHandler.handle(EntityModel.createNewUser(quaverId), req, res);
    }

    public static createMap(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        ResponseHandler.handle(EntityModel.createNewMap(quaverId), req, res);
    }
}

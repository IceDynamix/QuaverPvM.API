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

    public static selfGET(req: Request, res: Response): void {
        if (!req.user) res.status(401).json({ message: "Not logged in" });
        else res.status(200).json(req.user);
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

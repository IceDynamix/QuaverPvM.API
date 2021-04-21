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

        ResponseHandler.handle(EntityModel.find(filter).exec(), res);
    }

    public static selfGET(req: Request, res: Response): void {
        res.header("Access-Control-Expose-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Origin", config.clientBaseUrl);
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        if (!req.user) res.status(200).json(null);
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

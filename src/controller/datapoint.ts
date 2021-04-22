import { Request, Response } from "express";
import { DatapointModel } from "../models/datapoint";
import ResponseHandler from "./response";

export default class DatapointController {
    public static GET(req: Request, res: Response) {
        const { id, entity, before, after, populate } = req.query;

        let filter: any = {};
        if (id) filter._id = id;
        if (entity) filter.entity = entity;
        if (before || after) {
            filter.timestamp = {};
            if (before) filter.timestamp.$lt = before;
            if (after) filter.timestamp.$gt = after;
        }

        if (populate == "true") ResponseHandler.handle(DatapointModel.find(filter).populate("entity").exec(), req, res);
        else ResponseHandler.handle(DatapointModel.find(filter).exec(), req, res);
    }
}

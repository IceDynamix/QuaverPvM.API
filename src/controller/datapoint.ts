import { Request, Response } from "express";
import { EntityDatapointModel, GeneralDatapointModel } from "../models/datapoint";
import { EntityModel } from "../models/entity";
import ResponseHandler from "./response";

export default class DatapointController {
    public static async entitySingleGET(req: Request, res: Response) {
        const entity = await EntityModel.findById(req.params.id);
        ResponseHandler.handle(EntityDatapointModel.getCurrentEntityDatapoint(entity), res);
    }

    public static entityFullGET(req: Request, res: Response) {
        const id = req.params.id;
        ResponseHandler.handle(EntityDatapointModel.find({ entity: id }).sort({ timestamp: -1 }).exec(), res);
    }

    public static leaderboardGET(req: Request, res: Response) {
        const filter = {
            rd: { $lte: 100 },
            ...req.params,
        };
        ResponseHandler.handle(EntityDatapointModel.getAllCurrentDatapoints(filter), res);
    }

    public static generalGET(req: Request, res: Response) {
        ResponseHandler.handle(GeneralDatapointModel.find({}).sort({ timestamp: -1 }).exec(), res);
    }
}

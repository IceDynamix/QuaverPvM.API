import { Request, Response } from "express";
import { EntityDatapointModel, GeneralDatapointModel } from "../models/datapoint";
import ResponseHandler from "./response";

export default class DatapointController {
    public static async entitySingleGET(req: Request, res: Response) {
        const id = req.params.id;
        const results = await EntityDatapointModel.find({ entity: id }).sort({ timestamp: -1 }).exec();
        ResponseHandler.handle(new Promise((resolve, reject) => resolve(results.length > 0 ? results[0] : null)), res);
    }

    public static entityFullGET(req: Request, res: Response) {
        const id = req.params.id;
        ResponseHandler.handle(EntityDatapointModel.find({ entity: id }).sort({ timestamp: -1 }).exec(), res);
    }

    public static generalGET(req: Request, res: Response) {
        ResponseHandler.handle(GeneralDatapointModel.find({}).sort({ timestamp: -1 }).exec(), res);
    }
}

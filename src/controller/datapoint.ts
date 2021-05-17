import {Request, Response} from "express";
import {EntityDatapointModel, GeneralDatapointModel} from "../models/datapoint";
import {EntityModel} from "../models/entity";
import ResponseHandler from "./response";

export default class DatapointController {
    public static async entitySingleGET(req: Request, res: Response) {
        const entity = await EntityModel.findById(req.params.id);
        await ResponseHandler.handle(EntityDatapointModel.getCurrentEntityDatapoint(entity), res);
    }

    public static async entityFullGET(req: Request, res: Response) {
        const id = req.params.id;
        await ResponseHandler.handle(EntityDatapointModel.find({entity: id}).sort({timestamp: -1}).exec(), res);
    }

    public static async leaderboardGET(req: Request, res: Response) {
        await ResponseHandler.handle(EntityDatapointModel.getAllCurrentRankedDatapoints(req.query), res);
    }

    public static async generalGET(req: Request, res: Response) {
        await ResponseHandler.handle(GeneralDatapointModel.find({}).sort({timestamp: -1}).exec(), res);
    }
}

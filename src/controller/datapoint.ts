import {Request, Response} from "express";
import {EntityDatapointModel, GeneralDatapointModel} from "../models/datapoint";
import {EntityDoc, EntityModel} from "../models/entity";
import ResponseHandler from "./response";

export default class DatapointController {
    public static async entitySingleGET(req: Request, res: Response) {
        let entity = await EntityModel.findById(req.params.id).exec();
        if (!entity) return await ResponseHandler.handle({datapoint: null, entity: null}, res);

        let projected = await entity.projectQuaverData();
        const datapoint = await EntityDatapointModel.getCurrentEntityDatapoint(entity);
        await ResponseHandler.handle({datapoint, entity: projected}, res);
    }

    public static async entityFullGET(req: Request, res: Response) {
        const entity = await EntityModel.findById(req.params.id).exec();
        if (!entity) return await ResponseHandler.handle({datapoints: [], entity: null}, res);

        const projected = await entity.projectQuaverData();
        const datapoints = await EntityDatapointModel.find({entity: req.params.id}).sort({timestamp: -1}).exec();
        await ResponseHandler.handle({datapoints, entity: projected}, res);
    }

    public static async leaderboardGET(req: Request, res: Response) {
        const datapoints = await EntityDatapointModel.getAllCurrentRankedDatapoints(req.query);
        const entities = await Promise.all(datapoints.map(dp => (dp.entity as EntityDoc).projectQuaverData()));
        await ResponseHandler.handle({datapoints, entities}, res);
    }

    public static async generalGET(req: Request, res: Response) {
        await ResponseHandler.handle(GeneralDatapointModel.find({}).sort({timestamp: -1}).exec(), res);
    }
}

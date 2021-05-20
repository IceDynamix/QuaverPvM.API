import {Request, Response} from "express";
import {EntityDatapointModel, GeneralDatapointModel} from "../models/datapoint";
import {EntityDoc, EntityModel} from "../models/entity";

export default class DatapointController {
    public static async entitySingleGET(req: Request, res: Response, next) {
        let entity = await EntityModel.findById(req.params.id).exec();
        if (!entity) return res.json({datapoint: null, entity: null})

        let projected = await entity.projectQuaverData();
        const datapoint = await EntityDatapointModel.getCurrentEntityDatapoint(entity);
        res.json({datapoint, entity: projected})
    }

    public static async entityFullGET(req: Request, res: Response, next) {
        const entity = await EntityModel.findById(req.params.id).exec();
        if (!entity) return res.json({datapoints: [], entity: null})

        const projected = await entity.projectQuaverData();
        const datapoints = await EntityDatapointModel.find({entity: req.params.id}).sort({timestamp: -1}).exec();
        res.json({datapoints, entity: projected})
    }

    public static async leaderboardGET(req: Request, res: Response, next) {
        const datapoints = await EntityDatapointModel.getAllCurrentRankedDatapoints(req.query);
        const entities = await Promise.all(datapoints.map(dp => (dp.entity as EntityDoc).projectQuaverData()));
        res.json({datapoints, entities})
    }

    public static async generalGET(req: Request, res: Response, next) {
        res.json(await GeneralDatapointModel.find({}).sort({timestamp: -1}).exec())
    }

    public static async randomGET(req: Request, res: Response, next) {
        const {min, max} = req.query;
        const minRating = min ? parseInt(min as string, 10) : 0;
        const maxRating = max ? parseInt(max as string, 10) : 3000;
        const random = await EntityDatapointModel.randomInRange(minRating, maxRating);
        const entity = await (random.entity as EntityDoc).projectQuaverData();
        res.json({datapoint: random, entity})
    }
}

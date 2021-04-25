import { MatchModel } from "../models/match";
import { Request, Response } from "express";
import ResponseHandler from "./response";
import { Entity, EntityModel } from "../models/entity";

export default class MatchController {
    public static async GET(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        let user = req.user as Entity;
        let method = MatchModel.findOngoingMatch(user);
        ResponseHandler.handle(method, res, 200);
    }

    public static async POST(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        let user = req.user as Entity;
        let ongoing = await MatchModel.findOngoingMatch(user);
        if (ongoing) ResponseHandler.handle(new Promise((res) => res(ongoing)), res);
        else ResponseHandler.handle(MatchModel.matchmaker(user), res);
    }

    public static async resultsGET(req: Request, res: Response) {
        const { id, entity } = req.query;

        let method;
        if (id) method = MatchModel.find({ _id: id });
        else if (entity) {
            let entityObj = await EntityModel.findById(entity).exec();
            if (!entityObj) {
                ResponseHandler.handle(new Promise((resolve, reject) => resolve([])), res);
                return;
            } else {
                let ongoing = await MatchModel.findOngoingMatch(entityObj);
                method = MatchModel.findEntityResults(entityObj, ongoing);
            }
        } else method = MatchModel.find({});

        ResponseHandler.handle(method.populate("user").populate("map").exec(), res);
    }

    public static resultsPOST(req: Request, res: Response): void {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        const { giveUp } = req.body;
        ResponseHandler.handle(MatchModel.submitMatch(req.user as Entity, giveUp), res);
    }
}

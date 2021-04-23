import { MatchModel } from "../models/match";
import { Request, Response } from "express";
import ResponseHandler from "./response";
import { Entity } from "../models/entity";

export default class MatchController {
    public static async GET(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        let user = req.user as Entity;
        let method = MatchModel.findOngoingMatch(user).populate("entity1").populate("entity2").exec();
        ResponseHandler.handle(method, res, 200);
    }

    public static async POST(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        let user = req.user as Entity;
        let ongoing = await MatchModel.findOngoingMatch(user).populate("entity1").populate("entity2").exec();
        if (ongoing) ResponseHandler.handle(new Promise((res) => res(ongoing)), res);
        else ResponseHandler.handle(MatchModel.matchmaker(user), res);
    }

    public static resultsGET(req: Request, res: Response): void {
        const { id, entity } = req.query;

        let method;
        if (id) method = MatchModel.find({ _id: id });
        else if (entity) method = MatchModel.findEntityResults(entity.toString());
        else method = MatchModel.find({});

        ResponseHandler.handle(method.populate("entity1").populate("entity2").exec(), res);
    }

    public static resultsPOST(req: Request, res: Response): void {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        const { resign } = req.body;
        ResponseHandler.handle(MatchModel.submitMatch(req.user as Entity, resign), res);
    }
}

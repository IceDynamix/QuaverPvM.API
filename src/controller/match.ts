import { MatchModel } from "../models/match";
import { Request, Response } from "express";
import ResponseHandler from "./response";
import { Entity } from "../models/entity";

export default class MatchController {
    public static results(req: Request, res: Response): void {
        const { id, entity } = req.query;

        let method;
        if (id) method = MatchModel.find({ _id: id });
        else if (entity) method = MatchModel.findEntityResults(entity.toString());
        else method = MatchModel.find({});

        ResponseHandler.handle(method.populate("entity1").populate("entity2").exec(), req, res);
    }

    public static POST(req: Request, res: Response): void {
        // TODO: Result submission
        // MatchModel.finalizeOngoingMatch()
    }

    public static async GET(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }

        let user = req.user as Entity;
        let ongoing = await MatchModel.findOngoingMatch(user).populate("entity1").populate("entity2").exec();
        if (ongoing) ResponseHandler.handle(new Promise((resolve) => resolve(ongoing)), req, res, 200, true);
        else ResponseHandler.handle(MatchModel.matchmaker(user), req, res, 200, true);
    }
}

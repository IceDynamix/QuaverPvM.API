import {Match, MatchModel} from "../models/match";
import {Request, Response} from "express";
import ResponseHandler from "./response";
import {Entity, EntityDoc, EntityModel} from "../models/entity";

export default class MatchController {
    public static async GET(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({message: "Not logged in"});
            return;
        }
        let loggedIn = req.user as EntityDoc;
        let match = await MatchModel.findOngoingMatch(loggedIn);
        if (!match) return await ResponseHandler.handle({match: null, entities: []}, res, 200);
        let user = await loggedIn.projectQuaverData();
        let map = await (match.map as EntityDoc).projectQuaverData();
        return await ResponseHandler.handle({match, entities: [user, map]}, res, 200);
    }

    public static async POST(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({message: "Not logged in"});
            return;
        }
        let loggedIn = req.user as EntityDoc;
        let match = await MatchModel.findOngoingMatch(loggedIn);

        if (!match) match = await MatchModel.matchmaker(loggedIn);

        let user = await loggedIn.projectQuaverData();
        let map = await (match.map as EntityDoc).projectQuaverData();

        await ResponseHandler.handle({match, entities: [user, map]}, res);
    }

    public static async resultsGET(req: Request, res: Response) {
        const {id, entity} = req.query;

        let results: Match[];
        if (id) results = await MatchModel.find({_id: id});
        else if (entity) {
            let entityObj = await EntityModel.findById(entity).exec();
            if (!entityObj) {
                return await ResponseHandler.handle([], res);
            } else {
                let ongoing = await MatchModel.findOngoingMatch(entityObj);
                results = await MatchModel.findEntityResults(entityObj, ongoing);
            }
        } else results = await MatchModel.find({});

        let entities: EntityDoc[] = []
        results.forEach(r => entities.push((r.user as EntityDoc), (r.map as EntityDoc)));
        let projectedEntities = await Promise.all(entities.map(e => e.projectQuaverData()));

        await ResponseHandler.handle({matches: results, entities: projectedEntities}, res);
    }

    public static async resultsPOST(req: Request, res: Response) {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        const { giveUp } = req.body;
        await ResponseHandler.handle(MatchModel.submitMatch(req.user as Entity, giveUp), res);
    }
}

import {Match, MatchModel} from "../models/match";
import {Request, Response} from "express";
import {Entity, EntityDoc, EntityModel} from "../models/entity";

export default class MatchController {
    public static async GET(req: Request, res: Response, next) {
        if (!req.user) {
            res.status(401).json({message: "Not logged in"});
            return;
        }
        let loggedIn = req.user as EntityDoc;
        let match = await MatchModel.findOngoingMatch(loggedIn);
        if (!match) return res.json({match: null, entities: []})
        let user = await loggedIn.projectQuaverData();
        let map = await (match.map as EntityDoc).projectQuaverData();
        return res.json({match, entities: [user, map]})
    }

    public static async POST(req: Request, res: Response, next) {
        if (!req.user) {
            res.status(401).json({message: "Not logged in"});
            return;
        }

        let loggedIn = req.user as EntityDoc;
        let match = await MatchModel.findOngoingMatch(loggedIn);
        if (!match) match = await MatchModel.matchmaker(loggedIn);
        let user = await loggedIn.projectQuaverData();
        let map = await (match.map as EntityDoc).projectQuaverData();
        return res.json({match, entities: [user, map]})
    }

    public static async resultsGET(req: Request, res: Response, next) {
        const {id, entity} = req.query;

        let results: Match[];
        if (id) results = await MatchModel.find({_id: id});
        else if (entity) {
            let entityObj = await EntityModel.findById(entity).exec();
            if (!entityObj) {
                return res.json([]);
            } else {
                let ongoing = await MatchModel.findOngoingMatch(entityObj);
                results = await MatchModel.findEntityResults(entityObj, ongoing);
            }
        } else results = await MatchModel.find({});

        let entities: EntityDoc[] = []
        results.forEach(r => entities.push((r.user as EntityDoc), (r.map as EntityDoc)));
        let projectedEntities = await Promise.all(entities.map(e => e.projectQuaverData()));

        return res.json({matches: results, entities: projectedEntities});
    }

    public static async resultsPOST(req: Request, res: Response, next) {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }
        const { giveUp } = req.body;
        const response = await MatchModel.submitMatch(req.user as Entity, giveUp);
        return res.json(response);
    }
}

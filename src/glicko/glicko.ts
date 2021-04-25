import { Player, Rating, MatchResult, Period } from "go-glicko";
import { Entity, EntityModel } from "../models/entity";
import { MatchModel } from "../models/match";
import logging from "../config/logging";
import config from "../config/config";
import { EntityDatapointModel, EntityGlickoLink } from "../models/datapoint";

export default class Glicko {
    public static async updateAll() {
        let timestamp = new Date();

        let results = await MatchModel.find({
            processed: false,
            $or: [
                { result: true }, // User submitted a result, not null
                { result: false },
                { endsAt: { $lt: timestamp } }, // Timeout loss
            ],
        })
            .populate("user")
            .populate("map")
            .exec();

        let entities = await EntityModel.find().exec();
        let glickoPlayers: { [key: string]: Player } = {};

        for (const entity of entities) {
            const previous = await EntityDatapointModel.getCurrentEntityDatapoint(entity);
            glickoPlayers[entity.id] = new Player(new Rating(previous.rating, previous.rd, previous.sigma));
        }

        logging.debug(`Created ${entities.length} glicko player instances`);

        let period: Period = new Period(config.tau);
        Object.values(glickoPlayers).forEach((player) => period.addPlayer(player));

        logging.debug(`Added ${entities.length} players to period`);

        results.forEach((resultDoc) => {
            const { user, map, result } = resultDoc;

            // Timeout loss
            if (result == null) resultDoc.result = false;
            resultDoc.processed = true;
            resultDoc.save();

            // Populated already

            // @ts-ignore
            let glickoUser = glickoPlayers[user!.id];
            // @ts-ignore
            let glickoMap = glickoPlayers[map!.id];

            if (!glickoUser) {
                logging.error("User does not exist", user);
                return;
            }
            if (!glickoMap) {
                logging.error("Map does not exist", map);
                return;
            }

            period.addMatch(glickoUser, glickoMap, result ? MatchResult.WIN : MatchResult.LOSS);
        });

        logging.debug(`Added ${results.length} matches to period`);
        logging.debug(`Starting calculation`);

        period.Calculate();

        logging.debug(`Finished calculation`);

        await EntityDatapointModel.createNewDatapoints(timestamp, glickoPlayers);
    }

    // https://www.smogon.com/forums/threads/gxe-glixare-a-much-better-way-of-estimating-a-players-overall-rating-than-shoddys-cre.51169/
    public static glixare(rating: number, rd: number): number {
        return 25000 * (1 / (1 + Math.pow(10, ((1500 - rating) * Math.PI) / Math.sqrt(3 * Math.LN10 * Math.LN10 * rd * rd + 2500 * (64 * Math.PI * Math.PI + 147 * Math.LN10 * Math.LN10)))));
    }

    public static ranks() {
        return [
            { rank: "x", percentile: 0.01 },
            { rank: "u", percentile: 0.05 },
            { rank: "ss", percentile: 0.11 },
            { rank: "s+", percentile: 0.17 },
            { rank: "s", percentile: 0.23 },
            { rank: "s-", percentile: 0.3 },
            { rank: "a+", percentile: 0.38 },
            { rank: "a", percentile: 0.46 },
            { rank: "a-", percentile: 0.54 },
            { rank: "b+", percentile: 0.62 },
            { rank: "b", percentile: 0.7 },
            { rank: "b-", percentile: 0.78 },
            { rank: "c+", percentile: 0.84 },
            { rank: "c", percentile: 0.9 },
            { rank: "c-", percentile: 0.95 },
            { rank: "d+", percentile: 0.975 },
            { rank: "d", percentile: 1.0 },
        ];
    }
}

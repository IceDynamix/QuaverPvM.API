import { Player, Rating, MatchResult, Period } from "go-glicko";
import { EntityModel } from "./models/entity";
import { ResultModel } from "./models/result";
import logging from "./config/logging";
import Database from "./config/database";
import config from "./config/config";
import { DatapointModel } from "./models/datapoint";

const NAMESPACE = "GLICKO";

Database.connect();

class Glicko {
    public static async updateAll(save: boolean = false) {
        let timestamp = new Date();
        let entities = await EntityModel.find().exec();
        let results = await ResultModel.find({ processed: false }).exec();
        let glickoPlayers: { [key: string]: Player } = {};

        entities.forEach((entity) => {
            glickoPlayers[entity.id] = new Player(new Rating(entity.rating!, entity.rd!, entity.volatility!));
        });

        logging.debug(NAMESPACE, `Created ${entities.length} glicko player instances`);

        let period: Period = new Period(config.tau);
        Object.values(glickoPlayers).forEach((player: Player) => period.addPlayer(player));
        logging.debug(NAMESPACE, `Added ${entities.length} players to period`);

        results.forEach((resultDoc) => {
            const { entity1, entity2, result } = resultDoc;
            period.addMatch(
                glickoPlayers[entity1!.toString()],
                glickoPlayers[entity2!.toString()],
                result ? MatchResult.WIN : MatchResult.LOSS
            );
        });

        logging.debug(NAMESPACE, `Added ${results.length} matches to period`);

        logging.debug(NAMESPACE, `Starting calculation`);
        period.Calculate();
        logging.debug(NAMESPACE, `Finished calculation`);

        for (const id in glickoPlayers) {
            let player: Player = glickoPlayers[id];
            let entity = entities.find((entity) => entity.id == id)!;
            logging.debug(
                NAMESPACE,
                `${id} | Rating ${entity.rating?.toFixed(0)} -> ${player.Rating().R().toFixed(0)} | RD ${entity.rd?.toFixed(
                    0
                )} -> ${player.Rating().RD().toFixed(0)}`
            );
            if (save) {
                entity.rating = player.Rating().R();
                entity.rd = player.Rating().RD();
                entity.volatility = player.Rating().Sigma();
                entity.save();
                await DatapointModel.createNewDatapoint(entity._id, timestamp, entity.rating, entity.rd, entity.volatility);
            }
        }

        if (save) {
            logging.debug(NAMESPACE, `Changed ${entities.length} entities`);

            results.forEach((result) => {
                result.processed == true;
                result.save();
            });

            logging.debug(NAMESPACE, `Marked ${results.length} results as processed`);
        }
    }
}

Glicko.updateAll(true);

import { Player, Rating, MatchResult, Period } from "go-glicko";
import { EntityModel, ResultModel } from "./models/models";
import logging from "./config/logging";
import Database from "./config/database";
import config from "./config/config";

const NAMESPACE = "GLICKO";

Database.connect();

class Glicko {
    public static updateAll(): void {
        EntityModel.find()
            .exec()
            .then((entities) => {
                ResultModel.find({ processed: false })
                    .exec()
                    .then((results) => {
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
                                `${id} | Rating ${entity.rating?.toFixed(0)} -> ${player
                                    .Rating()
                                    .R()
                                    .toFixed(0)} | RD ${entity.rd?.toFixed(0)} -> ${player.Rating().RD().toFixed(0)}`
                            );
                            entity.rating = player.Rating().R();
                            entity.rd = player.Rating().RD();
                            entity.volatility = player.Rating().Sigma();
                            // entity.save();
                        }

                        logging.debug(NAMESPACE, `Changed ${entities.length} entities`);

                        // results.forEach((result) => {
                        //     result.processed == false;
                        //     result.save();
                        // });

                        logging.debug(NAMESPACE, `Marked ${results.length} results as processed`);
                    });
            });
    }
}

Glicko.updateAll();

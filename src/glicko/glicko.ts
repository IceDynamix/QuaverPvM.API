import { MatchResult, Period, Player, Rating } from "go-glicko";
import config from "../config/config";
import logging from "../config/logging";
import { EntityDatapointModel } from "../models/datapoint";
import { Entity, EntityModel } from "../models/entity";
import { Match } from "../models/match";
import { DocumentType } from "@typegoose/typegoose";

export default class Glicko {
    public static async updateAllEmpty() {
        let datapoints = await EntityDatapointModel.getAllCurrentDatapoints();

        let players = datapoints.map((dp) => ({ datapoint: dp, glicko: new Player(new Rating(dp.rating, dp.rd, dp.sigma)) }));

        logging.debug(`Created ${datapoints.length} glicko player instances`);

        let period: Period = new Period(config.tau);
        players.forEach((player) => period.addPlayer(player.glicko));

        logging.debug(`Added ${datapoints.length} players to period`);

        period.Calculate();

        for (let player of players) {
            let { datapoint, glicko } = player;
            let oldRd = datapoint.rd;
            let newDatapoint = await EntityDatapointModel.saveEntityGlicko(datapoint, glicko, false);
            logging.info(`${newDatapoint._id} | RD ${oldRd.toFixed(0)} -> ${newDatapoint.rd.toFixed(0)}`);
        }

        let currentDps = await EntityDatapointModel.getAllCurrentDatapoints();
        let rankedDps = currentDps.filter((dp) => dp.rd <= 100);
        // Populated
        let rankedUserDps = rankedDps.filter((dp) => (dp.entity as Entity).entityType == "user");
        let rankedMapDps = rankedDps.filter((dp) => (dp.entity as Entity).entityType == "map");

        for (let dp of rankedDps) await EntityDatapointModel.saveEntityRanks(dp, rankedDps, rankedUserDps, rankedMapDps);
    }

    public static async updateFromResult(match: DocumentType<Match>) {
        if (match.processed == true) return;

        let user = await EntityModel.findById(match.user);
        if (!user) return;
        let map = await EntityModel.findById(match.map);
        if (!map) return;

        logging.info(`Calculating match ${match.id}`);

        let userStats = await EntityDatapointModel.getCurrentEntityDatapoint(user);
        let mapStats = await EntityDatapointModel.getCurrentEntityDatapoint(map);

        let glickoUser = new Player(new Rating(userStats.rating, userStats.rd, userStats.sigma));
        let glickoMap = new Player(new Rating(mapStats.rating, mapStats.rd, mapStats.sigma));

        let period: Period = new Period(config.tau);
        period.addPlayer(glickoUser);
        period.addPlayer(glickoMap);

        // Timed out match == null, which resolves to a loss
        let outcome = match.result == true ? MatchResult.WIN : MatchResult.LOSS;
        period.addMatch(glickoUser, glickoMap, outcome);
        period.Calculate();

        // Values get saved in saveEntityGlicko()
        userStats.matches++;
        mapStats.matches++;

        if (outcome == MatchResult.WIN) userStats.wins++;
        else mapStats.wins++;

        let { rating: oldUserR, rd: oldUserRd, sigma: oldUserSigma } = userStats;
        let newUserDp = await EntityDatapointModel.saveEntityGlicko(userStats, glickoUser, false);
        logging.info(
            `Entity ${user._id} | Rating ${oldUserR.toFixed(0)} -> ${newUserDp.rating.toFixed(0)} | RD ${oldUserRd.toFixed(0)} -> ${newUserDp.rd.toFixed(0)} | Sigma ${oldUserSigma.toFixed(
                4
            )} -> ${newUserDp.sigma.toFixed(4)}`
        );

        let { rating: oldMapR, rd: oldMapRd, sigma: oldMapSigma } = mapStats;
        let newMapDp = await EntityDatapointModel.saveEntityGlicko(mapStats, glickoMap, false);
        logging.info(
            `Entity ${map._id} | Rating ${oldMapR.toFixed(0)} -> ${newMapDp.rating.toFixed(0)} | RD ${oldMapRd.toFixed(0)} -> ${newMapDp.rd.toFixed(0)} | Sigma ${oldMapSigma.toFixed(
                4
            )} -> ${newMapDp.sigma.toFixed(4)}`
        );

        let currentDps = await EntityDatapointModel.getAllCurrentDatapoints();
        let rankedDps = currentDps.filter((dp) => dp.rd <= 100);

        // Populated
        let rankedUserDps = rankedDps.filter((dp) => (dp.entity as Entity).entityType == "user");
        let rankedMapDps = rankedDps.filter((dp) => (dp.entity as Entity).entityType == "map");

        await EntityDatapointModel.saveEntityRanks(newUserDp, rankedDps, rankedUserDps, rankedMapDps);
        await EntityDatapointModel.saveEntityRanks(mapStats, rankedDps, rankedUserDps, rankedMapDps);
        match.processed = true;
        await match.save();
    }

    public static qrToGlicko(qr: number): number {
        return 1.28 * qr * qr + 500;
    }

    public static glickoToQr(glicko: number): number {
        return 2.5 * Math.sqrt(0.005 * (glicko - 500));
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

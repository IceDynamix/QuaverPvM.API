import { CronJob } from "cron";
import Glicko from "../glicko/glicko";
import { GeneralDatapointModel } from "../models/datapoint";
import logging from "./logging";
import { Entity } from "../models/entity";

// seconds? minutes hours date month weekday

class Cron {
    static crons = [
        new CronJob("00 00 00 * * *", () => {
            Glicko.updateAllEmpty().then(() => logging.info("Ran glickoJob cron"));
        }),
        new CronJob("00 00 00 * * *", () => {
            let n = 5;
            Entity.addNewMaps(n).then(() => logging.info("Ran newMapJob cron"));
        }),
        new CronJob("00 30 * * * *", () => {
            GeneralDatapointModel.createNewDatapoint().then((dp) => logging.info("Ran generalDpJob cron", dp));
        }),
    ];
    public static start() {
        Cron.crons.forEach((c) => c.start());
    }
}

export default Cron;

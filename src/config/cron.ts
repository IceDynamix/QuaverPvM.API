import { CronJob } from "cron";
import Glicko from "../glicko/glicko";
import { GeneralDatapointModel } from "../models/datapoint";
import logging from "./logging";
import { Entity } from "../models/entity";

// seconds? minutes hours date month weekday

const crons = [
    new CronJob("0 0 * * *", () => {
        logging.info("Running glickoJob cron");
        Glicko.updateAllEmpty()
            .then(() => logging.info("Finished running glickoJob cron"))
            .catch((err) => logging.error("Could not run glickoJob cron", err));
    }),
    new CronJob("0 0 * * *", () => {
        logging.info("Running newMapJob cron");
        let n = 5;
        Entity.addNewMaps(n)
            .then(() => logging.info("Finished running newMapJob cron"))
            .catch((err) => logging.error("Could not run newMapJob cron", err));
    }),
    new CronJob("*/30 * * * *", () => {
        logging.info("Running generalDpJob cron");
        GeneralDatapointModel.createNewDatapoint()
            .then((dp) => logging.info("Finished running generalDpJob cron", dp))
            .catch((err) => logging.error("Could not run generalDpJob cron", err));
    }),
];

function startCrons() {
    crons.forEach((c) => c.start());
    logging.info("Instantiated all cron jobs");
}

export { startCrons };

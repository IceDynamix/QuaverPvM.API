import { CronJob } from "cron";
import Glicko from "../glicko/glicko";
import { GeneralDatapointModel } from "../models/datapoint";
import logging from "./logging";
import { Entity } from "../models/entity";

// seconds? minutes hours date month weekday

let glickoJob = new CronJob("00 00 00 * * *", () => {
    Glicko.updateAllEmpty()
        .then(() => logging.info("Ran glickoJob cron"))
        .catch((err) => logging.error("Could not run glickoJob cron", err));
});
let newMapJob = new CronJob("00 00 00 * * *", () => {
    let n = 5;
    Entity.addNewMaps(n)
        .then(() => logging.info("Ran newMapJob cron"))
        .catch((err) => logging.error("Could not run newMapJob cron", err));
});
let generalDpJob = new CronJob("00 */30 * * * *", () => {
    GeneralDatapointModel.createNewDatapoint()
        .then((dp) => logging.info("Ran generalDpJob cron", dp))
        .catch((err) => logging.error("Could not run generalDpJob cron", err));
});

function startCrons() {
    glickoJob.start();
    newMapJob.start();
    generalDpJob.start();
}

export { startCrons };

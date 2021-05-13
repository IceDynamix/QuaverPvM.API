import { CronJob } from "cron";
import Glicko from "../glicko/glicko";
import { GeneralDatapointModel } from "../models/datapoint";
import logging from "./logging";
import { Entity } from "../models/entity";

// seconds? minutes hours date month weekday

const midnightJob = new CronJob("00 00 00 * * *", () => {
    Glicko.updateAllEmpty().then(() => {
        logging.info("Updated all RDs");
        // Make thresholds after updating ranks
        GeneralDatapointModel.createNewDatapoint().then(() => {
            logging.info("General datapoint created");
        });
    });
    Entity.addNewMaps(5);
});

export { midnightJob };

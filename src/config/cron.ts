import { CronJob } from "cron";
import { GeneralDatapointModel } from "../models/datapoint";
import logging from "./logging";

// seconds? minutes hours date month weekday

const midnightJob = new CronJob("00 00 00 * * *", () => {
    GeneralDatapointModel.createNewDatapoint().then(() => {
        logging.info("General datapoint created");
    });
});

export { midnightJob };

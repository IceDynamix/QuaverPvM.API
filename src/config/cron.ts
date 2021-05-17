import {CronJob} from "cron";
import Glicko from "../glicko/glicko";
import {EntityDatapointModel, GeneralDatapointModel} from "../models/datapoint";
import logging from "./logging";
import {Entity} from "../models/entity";

class Job {
    name: String;
    cronString: String;
    func: () => void;
    cronJob: CronJob;

    constructor(name, cronString, func) {
        this.name = name;
        this.cronString = cronString;
        this.func = func;
        this.cronJob = new CronJob(cronString, async () => {
            logging.info(`Running ${this.name} cron`);
            try {
                await func();
                logging.info(`Finished running ${this.name} cron, next execution at ${this.cronJob.nextDate()}`)
            } catch (e) {
                logging.error(`Could not run ${this.name} cron`, e)
            }
        });
    }

    public start() {
        this.cronJob.start();
    }
}

// seconds? minutes hours date month weekday
const jobs = [
    new Job("updateRdJob", "0 0 * * *", async () => {
        await Glicko.updateRd();
        await EntityDatapointModel.snapshot();
    }),
    new Job("newMapJob", "0 0 * * *", async () => {
        let n = 15;
        await Entity.addNewMaps(n);
    }),
    new Job("generalDpJob", "*/30 * * * *", async () => {
        await GeneralDatapointModel.createNewDatapoint()
    }),
]

function startCrons() {
    jobs.forEach((c) => c.start());
    logging.info("Instantiated all cron jobs");
}

export {startCrons};

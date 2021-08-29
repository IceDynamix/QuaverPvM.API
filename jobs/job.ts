import { CronJob } from "cron";

export default class Job {
    name: string;
    cronString: string;
    func: () => Promise<void>;
    private cronJob: CronJob;

    constructor(name: string, cronString: string, func: () => Promise<void>) {
        this.name = name;
        this.cronString = cronString;
        this.func = func;
        this.cronJob = new CronJob(cronString, async () => {
            console.info(`Running ${this.name} cron`);
            try {
                await func();
                console.info(`Finished running ${this.name} cron, next execution at ${this.cronJob.nextDate().toISOString()}`);
            } catch (e) {
                console.error(`Could not run ${this.name} cron`, e);
            }
        });
    }

    start() {
        this.cronJob.start();
        console.info(`Instantiated ${this.name} job, next execution at ${this.cronJob.nextDate().toISOString()}`);
    }
}

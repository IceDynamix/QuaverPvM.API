import Job from "./job";
import Ranking from "../src/ranking";
import History from "../src/history";

class JobHandler {
    private jobs = [new Job("updateRdJob", "0 0 * * *", Ranking.updateAllUserRd)];

    startCrons() {
        this.jobs.forEach((c) => c.start());
    }
}

export default new JobHandler();

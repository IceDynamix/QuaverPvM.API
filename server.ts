import Server from "./src/config/express";
import Ranking from "./src/ranking";
import Matching from "./src/matching";
import Bree from "bree";
import jobs from "./jobs";

async function main() {
    await Matching.cleanUpAllMatches();
    await Ranking.seedUserLeaderboard();
    await Ranking.seedMapLeaderboard();

    const bree = new Bree({ jobs });
    bree.start();

    new Server();
}

main();

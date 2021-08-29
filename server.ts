import Server from "./src/config/express";
import Ranking from "./src/ranking";
import Matching from "./src/matching";
import jobHandler from "./jobs/jobHandler";

async function main() {
    await Matching.cleanUpAllMatches();
    await Ranking.seedUserLeaderboard();
    await Ranking.seedMapLeaderboard();

    jobHandler.startCrons();

    new Server();
}

main();

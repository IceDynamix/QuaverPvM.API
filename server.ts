import Server from "./src/config/express";
import Ranking from "./src/ranking";
import Matching from "./src/matching";

async function main() {
    await Matching.cleanUpAllMatches();
    await Ranking.seedUserLeaderboard();
    await Ranking.seedMapLeaderboard();
    new Server();
}

main();

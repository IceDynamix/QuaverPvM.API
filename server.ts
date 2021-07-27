import Server from "./src/config/express";
import Ranking from "./src/ranking";

async function main() {
    await Ranking.seedUserLeaderboard();
    await Ranking.seedMapLeaderboard();
    new Server();
}

main();

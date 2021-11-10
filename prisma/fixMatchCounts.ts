import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// The current match/win counters are incremented per match instead of computed live
// This script updates the counts with the live counts in case there were any errors during the incrementation
async function main() {
    const maps = await prisma.map.findMany({ include: { matches: true } });
    for (const map of maps) {
        const matchesPlayed = map.matches.length;
        const winCount = map.matches.filter((m) => m.result !== "WIN").length;

        if (map.matchesPlayed === matchesPlayed || map.wins === winCount) continue;

        console.log(`Updating \t${map.mapId}\t(${map.mapRate}x)\t| Count ${map.matchesPlayed} -> ${matchesPlayed}\t| Wins ${map.wins} -> ${winCount}`);
        await prisma.map.update({
            where: { mapId_mapRate: { mapId: map.mapId, mapRate: map.mapRate } },
            data: {
                matchesPlayed: matchesPlayed,
                wins: winCount,
            },
        });
    }
}

main();

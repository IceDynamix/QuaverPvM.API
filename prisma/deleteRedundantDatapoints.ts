import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// There used to be a datapoint update every 24h but now it's being updated after every match
// This script deletes the ones where no matches have been played and keeps the earliest one
async function main() {
    const users = await prisma.user.findMany();
    for (const user of users) {
        console.log(user.userId);

        let redundantDatapoints = [];

        const datapoints = await prisma.userHistory.findMany({
            where: { userId: user.userId },
            orderBy: { timestamp: "asc" },
        });

        let previousMatchesPlayed = 0;

        for (const datapoint of datapoints) {
            if (datapoint.matchesPlayed == previousMatchesPlayed) {
                redundantDatapoints.push(datapoint.timestamp);
            } else {
                previousMatchesPlayed = datapoint.matchesPlayed;
            }
        }

        const { count } = await prisma.userHistory.deleteMany({
            where: {
                userId: user.userId,
                timestamp: { in: redundantDatapoints },
            },
        });

        console.log(`Deleted ${count} datapoints`);
    }

    const maps = await prisma.map.findMany();
    for (const map of maps) {
        console.log(map.mapId);

        let redundantDatapoints = [];

        const datapoints = await prisma.mapHistory.findMany({
            where: { mapId: map.mapId, mapRate: map.mapRate },
            orderBy: { timestamp: "asc" },
        });

        let previousMatchesPlayed = 0;

        for (const datapoint of datapoints) {
            if (datapoint.matchesPlayed == previousMatchesPlayed) {
                redundantDatapoints.push(datapoint.timestamp);
            } else {
                previousMatchesPlayed = datapoint.matchesPlayed;
            }
        }

        const { count } = await prisma.mapHistory.deleteMany({
            where: {
                mapId: map.mapId,
                timestamp: { in: redundantDatapoints },
            },
        });

        console.log(`Deleted ${count} datapoints`);
    }
}

main();

import { PrismaClient } from "@prisma/client";
import Glicko from "../src/glicko";

const prisma = new PrismaClient();
import maps from "../maps.json";

async function seed() {
    console.log(`Start seeding ...`);

    for (const map of maps) {
        const mapString = `${map.MapId} | ${map.Artist} - ${map.Title} [${map.DifficultyName}]`;
        for (const rate of [0.8, 0.9, 1.0, 1.1, 1.2]) {
            const rateInt = Math.round(rate * 10);
            const difficulty = (map as any)[`Difficulty${rateInt.toString().padStart(2, "0")}X`];
            const rating = Glicko.qrToGlicko(difficulty);
            try {
                await prisma.map.create({
                    data: {
                        mapId: map.MapId,
                        mapsetId: map.MapSetId,
                        mapRate: rate,
                        artist: map.Artist,
                        title: map.Title,
                        difficultyName: map.DifficultyName,
                        difficulty,
                        creator: map.Creator,
                        rating,
                    },
                });
                console.info(`Added ${mapString} ${rate}x`);
            } catch (err) {
                console.info(`Skipped ${mapString} ${rate}x (${err})`);
            }
        }
    }
}

seed()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

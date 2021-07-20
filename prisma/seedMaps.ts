import { PrismaClient } from "@prisma/client";
import fs from "fs";
import Glicko from "../src/glicko/glicko";

const prisma = new PrismaClient();
const mapsDatasetPath = "./maps.json";

async function main() {
    console.log(`Start seeding ...`);

    if (!fs.existsSync(mapsDatasetPath)) throw "No map dataset generated";
    const maps = JSON.parse(fs.readFileSync(mapsDatasetPath).toString());

    for (const map of maps) {
        const mapString = `${map.MapId} | ${map.Artist} - ${map.Title} [${map.DifficultyName}]`;
        for (const rate of [0.8, 0.9, 1.0, 1.1, 1.2]) {
            const rateInt = Math.round(rate * 10);
            const difficulty = map[`Difficulty${rateInt.toString().padStart(2, "0")}X`];
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

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

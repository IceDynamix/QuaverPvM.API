import fs from "fs";
import sqlite3 from "sqlite3";
import { open } from "sqlite";
import yaml from "js-yaml";
import dotenv from "dotenv";

dotenv.config();

async function main() {
    if (!process.env.QUAVER_DB_PATH) throw "QUAVER_DB_PATH env not set";
    if (!process.env.QUAVER_SONGS_PATH) throw "QUAVER_SONGS_PATH env not set";

    let quaverDb = await open({ filename: process.env.QUAVER_DB_PATH, driver: sqlite3.Database });

    console.log(`Start reading...`);
    let maps = await quaverDb.all(`
        SELECT
            MapId,
            MapSetId,
            Directory,
            Artist,
            Title,
            DifficultyName,
            Creator,
            SongLength,
            Difficulty08X,
            Difficulty09X,
            Difficulty10X,
            Difficulty11X,
            Difficulty12X
        FROM Map
        WHERE RankedStatus = 2 -- Ranked
            AND Mode = 1 -- 4k
            AND cast(LongNoteCount as real)/(RegularNoteCount + LongNoteCount) < 0.6 -- <60% LN
            AND SongLength > 120000 -- 2 minutes
            AND SongLength < 300000 -- 5 minutes
    `);
    const count = maps.length;
    console.log(`Found ${count} maps`);

    const nsvMaps = maps.filter((map, i) => {
        const path = `${process.env.QUAVER_SONGS_PATH}/${map.Directory}/${map.MapId}.qua`;
        if (!fs.existsSync(path)) {
            console.log(`${i}/${count}\tRejected ${path} (File does not exist)`);
            return false;
        }

        const mapContent: any = yaml.load(fs.readFileSync(path, "utf8"));
        const timingPointsAreNsv = mapContent.BPMDoesNotAffectScrollVelocity || mapContent.TimingPoints.length === 1;
        const nsv = mapContent.SliderVelocities.length === 0;

        if (!timingPointsAreNsv && nsv) {
            console.log(`${i}/${count}\tRejected ${path} (File was not NSV)`);
            return false;
        }

        return true;
    });

    console.log(`Found ${nsvMaps.length} NSV maps`);

    fs.writeFileSync("./maps.json", JSON.stringify(nsvMaps));
    console.log(`Finished writing to file`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

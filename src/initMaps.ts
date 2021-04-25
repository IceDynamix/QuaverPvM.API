import Database from "./config/database";
import { EntityModel } from "./models/entity";
import fs from "fs";
import logging from "./config/logging";

function addNewMaps(count: number) {
    let validMaps = fs
        .readFileSync("./maps.txt")
        .toString()
        .split("\r\n")
        .map((n) => parseInt(n));

    // Shuffle
    for (let i = validMaps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validMaps[i], validMaps[j]] = [validMaps[j], validMaps[i]];
    }

    let mapsToAdd = validMaps.slice(0, count);

    Database.connect();

    for (const mapId of mapsToAdd) {
        EntityModel.createNewMap(mapId)
            .then((map) => logging.info(`Added ${mapId}`))
            .catch((err) => logging.info(`Skipped ${mapId} (${err})`));
    }
}

addNewMaps(100);
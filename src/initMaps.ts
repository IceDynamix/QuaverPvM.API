import Database from "./config/database";
import { EntityModel } from "./models/entity";
import fs from "fs";
import logging from "./config/logging";

export function addNewMaps(count: number) {
    let validMaps = fs
        .readFileSync("./maps.tsv")
        .toString()
        .split("\r\n")
        .map((row) => row.split("\t"));

    // Shuffle
    for (let i = validMaps.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [validMaps[i], validMaps[j]] = [validMaps[j], validMaps[i]];
    }

    let mapsToAdd = validMaps.slice(0, count);
    console.log(mapsToAdd);

    Database.connect();

    for (const map of mapsToAdd) {
        let [mapId, diff08X, diff09X, diff10X, diff11X, diff12X] = map;
        let difficulty = [
            { rate: 0.8, diff: parseFloat(diff08X) },
            { rate: 0.9, diff: parseFloat(diff09X) },
            { rate: 1.0, diff: parseFloat(diff10X) },
            { rate: 1.1, diff: parseFloat(diff11X) },
            { rate: 1.2, diff: parseFloat(diff12X) },
        ];

        EntityModel.createNewMap(parseInt(mapId), difficulty)
            .then((map) => logging.info(`Added ${mapId}`))
            .catch((err) => logging.info(`Skipped ${mapId} (${err})`));
    }
}

import Database from "./config/database";
import { EntityModel } from "./models/entity";
import fs from "fs";

let validMaps = fs
    .readFileSync("./maps.txt")
    .toString()
    .split("\r\n")
    .map((n) => parseInt(n));

for (let i = validMaps.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [validMaps[i], validMaps[j]] = [validMaps[j], validMaps[i]];
}

let mapsToAdd = validMaps.slice(0, 50);

Database.connect();

for (const mapId of mapsToAdd) {
    EntityModel.createNewMap(mapId)
        .then((map) => console.log(`Added ${mapId}`))
        .catch((err) => console.log(`Skipped ${mapId} (${err})`));
}

console.log("End");

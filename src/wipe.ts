import Database from "./config/database";
import { EntityModel } from "./models/entity";
import { MatchModel } from "./models/match";
import { EntityDatapointModel } from "./models/datapoint";
import logging from "./config/logging";

async function wipe() {
    Database.connect();
    await EntityDatapointModel.deleteMany({}).exec();
    await EntityModel.deleteMany({ entityType: "map" }).exec();
    await MatchModel.deleteMany({}).exec();
    let users = await EntityModel.find({}).exec();
    for (const entity of users) await EntityDatapointModel.createFreshDatapoint(entity);
    await EntityModel.addNewMaps(500);
}

wipe().then(() => logging.info("Wipe completed"));

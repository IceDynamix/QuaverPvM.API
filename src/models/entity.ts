import { DocumentType, getModelForClass, modelOptions, prop, Severity } from "@typegoose/typegoose";
import config from "../config/config";
import Requester from "../requester/requester";
import { EntityDatapointModel } from "./datapoint";
import fs from "fs";
import logging from "../config/logging";

type EntityType = "map" | "user";
type EntityDoc = DocumentType<Entity>;

@modelOptions({
    schemaOptions: { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } },
    options: { allowMixed: Severity.ALLOW },
})
class Entity {
    @prop() public entityType!: EntityType;
    @prop() public quaverId!: number;
    @prop() public mapRate?: number;

    public static async createNewUser(quaverId: number): Promise<EntityDoc> {
        let quaverUser = await Entity.fetchQuaverUser(quaverId, 0);
        if (!quaverUser) throw "Quaver user does not exist";
        let newUser = await EntityModel.create({ quaverId, entityType: "user" });
        await EntityDatapointModel.createFreshDatapoint(newUser);
        return newUser;
    }

    public static async createNewMap(quaverId: number, mapRate: number, diff: number): Promise<EntityDoc> {
        let newMap = await EntityModel.create({ quaverId, entityType: "map", mapRate });

        // Apply rating scaling roughly depending on difficulty
        // The spread of all difficulty values in the total set of maps is roughly linear

        const linear = (x1: number, x2: number, y1: number, y2: number) => ((diff - x1) / (x2 - x1)) * (y2 - y1) + y1;

        let ratingAdjustment: number;
        if (diff >= 40) ratingAdjustment = 1000;
        else if (diff >= 0) ratingAdjustment = linear(0, 40, -1000, 1000);
        else ratingAdjustment = -1000;

        await EntityDatapointModel.createFreshDatapoint(newMap, 1500 + ratingAdjustment, 200);
        return newMap;
    }

    static async fetchQuaverUser(id: number | string, mode: number): Promise<any> {
        const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/users/full/${id}`);
        if (response.status != 200) return null;
        return response.user;
    }

    static async fetchQuaverMap(id: number | string): Promise<any> {
        const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/maps/${id}`);
        if (response.status != 200) return null;
        return response.map;
    }

    static addNewMaps(count: number) {
        let validMaps = fs
            .readFileSync("./maps.tsv")
            .toString()
            .split("\n")
            .map((row) => row.split("\t"));

        // Shuffle
        for (let i = validMaps.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [validMaps[i], validMaps[j]] = [validMaps[j], validMaps[i]];
        }

        let mapsToAdd = validMaps.slice(0, count);

        for (const [mapId, rate, diff] of mapsToAdd) {
            EntityModel.createNewMap(parseInt(mapId), parseFloat(rate), parseFloat(diff))
                .then((map) => logging.info(`Added ${mapId}`))
                .catch((err) => logging.info(`Skipped ${mapId} (${err})`));
        }
    }
}

const EntityModel = getModelForClass<typeof Entity>(Entity);

export { EntityModel, Entity, EntityDoc, EntityType };

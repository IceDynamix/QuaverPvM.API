import {DocumentType, getModelForClass, modelOptions, prop, Severity} from "@typegoose/typegoose";
import {EntityDatapointModel} from "./datapoint";
import fs from "fs";
import logging from "../config/logging";
import Glicko from "../glicko/glicko";
import {QuaverDataModel} from "./quaverData";

type EntityType = "map" | "user";
type EntityDoc = DocumentType<Entity>;

@modelOptions({
    schemaOptions: {timestamps: true, toObject: {getters: true}, toJSON: {getters: true}},
    options: {allowMixed: Severity.ALLOW},
})
class Entity {
    @prop() public entityType!: EntityType;
    @prop() public quaverId!: number;
    @prop() public mapRate?: number;

    public static async createNewUser(quaverId: number): Promise<EntityDoc> {
        let quaverUser = (await QuaverDataModel.getQuaverData(quaverId, "user")).quaverData;
        if (!quaverUser) throw "Quaver user does not exist";
        let newUser = await EntityModel.create({quaverId, entityType: "user", quaverData: quaverUser});

        let overallRating = quaverUser.keys4?.stats?.overall_performance_rating;
        // `sum 0.95^x from 0 to inf` converges to 20
        // This means the weighted average of top plays is overallRating / 20
        let rating = overallRating ? Glicko.qrToGlicko(overallRating / 20) : 1500;

        // Reduce rd up to 150 when user has up to 500 play count
        let playCount = quaverUser.keys4?.stats?.play_count;
        let rd = playCount ? 350 - 150 * (Math.min(500, playCount) / 500) : 350;

        await EntityDatapointModel.createFreshDatapoint(newUser, rating, rd);
        return newUser;
    }

    public static async createNewMap(quaverId: number, mapRate: number, diff: number): Promise<EntityDoc> {
        await QuaverDataModel.getQuaverData(quaverId, "map");
        let newMap = await EntityModel.create({quaverId, entityType: "map", mapRate});

        // Apply rating scaling roughly depending on difficulty
        let rating = Glicko.qrToGlicko(diff);
        await EntityDatapointModel.createFreshDatapoint(newMap, rating, 200);
        return newMap;
    }

    public async getQuaverData() {
        return await QuaverDataModel.getQuaverData(this.quaverId, this.entityType);
    }

    public async projectQuaverData(this: EntityDoc) {
        return {...this.toObject(), quaverData: (await this.getQuaverData()).toObject().quaverData};
    }

    static async addNewMaps(count: number) {
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
            try {
                await EntityModel.createNewMap(parseInt(mapId), parseFloat(rate), parseFloat(diff));
                logging.info(`Added ${mapId}`);
            } catch (err) {
                logging.info(`Skipped ${mapId} (${err})`);
            }
        }
    }
}

const EntityModel = getModelForClass<typeof Entity>(Entity);

export { EntityModel, Entity, EntityDoc, EntityType };

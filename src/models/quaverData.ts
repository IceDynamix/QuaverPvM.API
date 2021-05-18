import {getModelForClass, modelOptions, prop, Severity} from "@typegoose/typegoose";
import {EntityType} from "./entity";
import Requester from "../requester/requester";
import config from "../config/config";
import logging from "../config/logging";

const cacheDurations: { [type in EntityType]: number } = {
    "user": 6 * 60 * 60 * 1000, // 6 hours
    "map": -1 // indefinite (ranked maps don't change data)
};

@modelOptions({
    options: {allowMixed: Severity.ALLOW},
})
class QuaverData {
    @prop() public entityType!: EntityType;
    @prop() public quaverId!: number;
    @prop() public quaverData!: any;
    @prop() public timestamp!: Date;

    get cachedUntil(): Date | null {
        let cacheDuration = cacheDurations[this.entityType];
        if (cacheDuration === -1) return null;
        return new Date(this.timestamp.getTime() + cacheDuration);
    }

    public static async getQuaverData(quaverId: number, entityType: EntityType) {
        let result = await QuaverDataModel.findOne({quaverId, entityType}).exec();
        if (result && result.quaverData != null) {
            let cachedUntil = result.cachedUntil;
            if (!cachedUntil || new Date() < cachedUntil) return result;
        }
        // data is not cached
        let quaverData;
        switch (entityType) {
            case "map":
                quaverData = await this.fetchQuaverMap(quaverId);
                break;
            case "user":
                quaverData = await this.fetchQuaverUser(quaverId);
                break;
        }
        let timestamp = new Date();
        if (!result)
            return await QuaverDataModel.create({quaverId, entityType, quaverData, timestamp});
        else {
            result.quaverData = quaverData;
            result.timestamp = timestamp;
            return await result.save();
        }
    }

    private static async fetchQuaverUser(id: number | string): Promise<any> {
        logging.info("Requesting Quaver user " + id);
        let retries = 0;
        while (retries < 2) {
            try {
                const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/users/full/${id}`);
                if (response.status != 200) return null;
                // Remove unnecessary data
                delete response.user.profile_badges;
                delete response.user.activity_feed;

                return response.user;
            } catch (err) {
                logging.error("Something went wrong while requesting a Quaver user", err)
                retries++;
            }
        }
        return null;
    }

    private static async fetchQuaverMap(id: number | string): Promise<any> {
        logging.info("Requesting Quaver map " + id);
        const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/maps/${id}`);
        if (response.status != 200) return null;
        return response.map;
    }
}

const QuaverDataModel = getModelForClass<typeof QuaverData>(QuaverData);

export {QuaverDataModel}
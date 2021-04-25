import { getModelForClass, modelOptions, mongoose, prop, Severity } from "@typegoose/typegoose";
import config from "../config/config";
import Requester from "../requester/requester";
import { EntityDatapointModel, GeneralDatapointModel } from "./datapoint";

type EntityType = "map" | "user";

@modelOptions({
    schemaOptions: { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } },
    options: { allowMixed: Severity.ALLOW },
})
class Entity {
    @prop() public steamId?: string; // Used for user login, null for maps obviously
    @prop() public entityType!: EntityType;
    @prop() public quaverId?: number; // Have to figure that out from user input later for users

    public static async connectUserToQuaver(user: Entity, quaverId: number) {
        if (user.quaverId) return { success: false, message: "User ID is already linked" };

        // just convert it to mongoose doc to have it easy
        let userDoc = await EntityModel.findOne({ steamId: user.steamId }).exec();
        if (!userDoc) throw "what the hell";

        const result = await EntityModel.findOne({ entityType: "user", quaverId }).exec();
        if (result) return { success: false, message: "Someone else has linked this user already?" };

        let quaverUser = await Entity.fetchQuaverUser(quaverId, 1);
        if (!quaverUser) throw "Quaver user does not exist";
        if (quaverUser.steam_id == user.steamId) {
            userDoc.quaverId = quaverId;
            userDoc.save();
            return { success: true, quaverUser };
        } else {
            return { success: false, message: "User does not match" };
        }
    }

    public static async createNewMap(quaverId: number): Promise<Entity> {
        const result = await EntityModel.findOne({ entityType: "map", quaverId }).exec();
        if (result) throw "Map already exists";
        else {
            let quaverMap = await Entity.fetchQuaverMap(quaverId);
            if (!quaverMap) throw "Quaver map does not exist";
            let newMap = await EntityModel.create({ quaverId, entityType: "map" });

            // Apply rating scaling roughly depending on difficulty
            // Approximation using 3 segmented linear functions
            // https://docs.google.com/spreadsheets/d/1lfBCM6EAdJ1n-xf8HqR7PEEJDFoqApI8uy5s8ESf45g/edit#gid=247636023
            //
            // { qr: 2.5, percentile: 1.0 },
            // { qr: 7, percentile: 0.55 },
            // { qr: 18.5, percentile: 0.17 },
            // { qr: 35, percentile: 0.01 },

            const diff = quaverMap.difficulty_rating;
            let percentile = 0;
            const linear = (x1: number, x2: number, y1: number, y2: number) => ((diff - x1) / (x2 - x1)) * (y2 - y1) + y1;

            if (diff > 35) percentile = 0.01;
            else if (diff > 18.5) percentile = linear(18.5, 35, 0.17, 0.01);
            else if (diff > 7) percentile = linear(7, 18.5, 0.55, 0.17);
            else if (diff > 2) percentile = linear(2, 7, 1, 0.55);
            else percentile = 1;

            let ratingChange = (0.5 - percentile) * 1000; // Spreads rating from 500 to 2500

            await EntityDatapointModel.createFreshDatapoint(newMap, 1500 + ratingChange, 200);

            return newMap;
        }
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
}

const EntityModel = getModelForClass<typeof Entity>(Entity);

export { EntityModel, Entity, EntityType };

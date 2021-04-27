import { getModelForClass, modelOptions, mongoose, prop, Severity } from "@typegoose/typegoose";
import config from "../config/config";
import Requester from "../requester/requester";
import { EntityDatapointModel, GeneralDatapointModel } from "./datapoint";
import { DocumentType } from "@typegoose/typegoose";
import Glicko from "../glicko/glicko";

type EntityType = "map" | "user";
type EntityDoc = DocumentType<Entity>;

@modelOptions({
    schemaOptions: { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } },
    options: { allowMixed: Severity.ALLOW },
})
class Entity {
    @prop() public entityType!: EntityType;
    @prop() public quaverId!: number;

    public static async createNewUser(quaverId: number): Promise<EntityDoc> {
        let quaverUser = await Entity.fetchQuaverUser(quaverId, 0);
        if (!quaverUser) throw "Quaver user does not exist";
        let newUser = await EntityModel.create({ quaverId, entityType: "user" });
        await EntityDatapointModel.createFreshDatapoint(newUser);
        return newUser;
    }

    public static async createNewMap(quaverId: number): Promise<EntityDoc> {
        const result = await EntityModel.findOne({ entityType: "map", quaverId }).exec();
        if (result) throw "Map already exists";
        else {
            let quaverMap = await Entity.fetchQuaverMap(quaverId);
            if (!quaverMap) throw "Quaver map does not exist";
            let newMap = await EntityModel.create({ quaverId, entityType: "map" });

            // Apply rating scaling roughly depending on difficulty
            // Approximation using 4 segmented linear functions
            // https://docs.google.com/spreadsheets/d/1lfBCM6EAdJ1n-xf8HqR7PEEJDFoqApI8uy5s8ESf45g/edit#gid=247636023
            //
            // { qr: 2.5, percentile: 1.0 },
            // { qr: 7, percentile: 0.55 },
            // { qr: 18.5, percentile: 0.17 },
            // { qr: 35, percentile: 0.01 },
            // { qr: 40, percentile: 0.001 },

            const diff = quaverMap.difficulty_rating;
            let percentile = 0;
            const linear = (x1: number, x2: number, y1: number, y2: number) => ((diff - x1) / (x2 - x1)) * (y2 - y1) + y1;

            if (diff >= 40) percentile = 0.001;
            else if (diff >= 35) percentile = linear(35, 40, 0.01, 0.001);
            else if (diff >= 18.5) percentile = linear(18.5, 35, 0.17, 0.01);
            else if (diff >= 7) percentile = linear(7, 18.5, 0.55, 0.17);
            else if (diff >= 3) percentile = linear(2, 7, 0.999, 0.55);
            else percentile = 0.999;

            // function errs if percentile is exactly 1 or 0
            let newRating = Glicko.gxeToGlicko(1 - percentile, 200);

            await EntityDatapointModel.createFreshDatapoint(newMap, newRating, 200);
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

export { EntityModel, Entity, EntityDoc, EntityType };

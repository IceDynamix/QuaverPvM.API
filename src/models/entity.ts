import { Rating } from "go-glicko";
import { getModelForClass, modelOptions, mongoose, prop, Severity } from "@typegoose/typegoose";
import config from "../config/config";
import Requester from "../requester/requester";

const defaultRating: Rating = Rating.NewDefaultRating();

type EntityType = "map" | "user";

@modelOptions({
    schemaOptions: { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } },
    options: { allowMixed: Severity.ALLOW },
})
class Entity {
    @prop()
    public quaverId?: number;

    @prop()
    public entityType!: EntityType;

    @prop()
    public info?: object; // Quaver user.info or map

    @prop({ default: defaultRating.R() })
    public rating?: number;

    @prop({ default: defaultRating.RD() })
    public rd?: number;

    @prop({ default: defaultRating.Sigma() })
    public volatility?: number;

    // https://www.smogon.com/forums/threads/gxe-glixare-a-much-better-way-of-estimating-a-players-overall-rating-than-shoddys-cre.51169/
    get glixare() {
        if (!this.rating || !this.rd || this.rd > 100) return -1;
        return (
            1 /
            (1 +
                Math.pow(
                    10,
                    ((1500 - this.rating) * Math.PI) /
                        Math.sqrt(
                            3 * Math.LN10 * Math.LN10 * this.rd * this.rd +
                                2500 * (64 * Math.PI * Math.PI + 147 * Math.LN10 * Math.LN10)
                        )
                ))
        );
    }

    get letterRank(): string {
        if (this.glixare === -1) return "z";
        const percentile = 1 - this.glixare;
        if (percentile < 0.01) return "x";
        if (percentile < 0.05) return "u";
        if (percentile < 0.11) return "ss";
        if (percentile < 0.17) return "s+";
        if (percentile < 0.23) return "s";
        if (percentile < 0.3) return "s-";
        if (percentile < 0.38) return "a+";
        if (percentile < 0.46) return "a";
        if (percentile < 0.54) return "a-";
        if (percentile < 0.62) return "b+";
        if (percentile < 0.7) return "b";
        if (percentile < 0.78) return "b-";
        if (percentile < 0.84) return "c+";
        if (percentile < 0.9) return "c";
        if (percentile < 0.95) return "c-";
        if (percentile < 0.95) return "c-";
        if (percentile < 0.975) return "d+";
        return "d";
    }

    public static async findUser(id: number | string) {
        return await EntityModel.findOne(Entity.createIdFilter("user", id)).exec();
    }

    public static async findMap(id: number | string) {
        return await EntityModel.findOne(Entity.createIdFilter("map", id)).exec();
    }

    public static async createNewUser(quaverId: number): Promise<Entity> {
        const result = await EntityModel.findOne({ entityType: "user", quaverId }).exec();
        if (result) throw "User already exists";
        else {
            let quaverUser = await Entity.fetchQuaverUser(quaverId, 1);
            if (!quaverUser) throw "Quaver user does not exist";
            return await EntityModel.create({ quaverId, entityType: "user", info: quaverUser.info });
        }
    }

    public static async createNewMap(quaverId: number): Promise<Entity> {
        const result = await EntityModel.findOne({ entityType: "map", quaverId }).exec();
        if (result) throw "Map already exists";
        else {
            let quaverMap = await Entity.fetchQuaverMap(quaverId);
            if (!quaverMap) throw "Quaver map does not exist";
            return await EntityModel.create({ quaverId, entityType: "map", info: quaverMap.info });
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

    static createIdFilter(entityType: EntityType, input: string | number): mongoose.FilterQuery<Entity> {
        const quaverId = parseInt(input.toString());
        if (input) return { entityType, quaverId };
        else if (mongoose.Types.ObjectId.isValid(input)) return { entityType, _id: input };
        else throw "Provided ID was not valid";
    }
}

const EntityModel = getModelForClass<typeof Entity>(Entity);

export { EntityModel, Entity, EntityType };

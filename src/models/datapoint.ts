import { getModelForClass, mongoose, prop, Ref } from "@typegoose/typegoose";
import { Entity } from "./entity";
import { MatchModel } from "./match";

class Datapoint {
    @prop({ ref: Entity })
    public entity: Ref<Entity>;

    @prop({ default: new Date() })
    public timestamp!: Date;

    @prop({ default: 1500 })
    public rating!: number;

    @prop({ default: 350 })
    public rd!: number;

    @prop({ default: 0.06 })
    public volatility!: number;

    @prop({ default: 0 })
    public wins!: number;

    @prop({ default: 0 })
    public matches!: number;

    public static async createNewDatapoint(timestamp: Date, entity: any) {
        const results = await MatchModel.findEntityResults(entity._id).exec();
        const wins = results.filter((r) => (r.entity1 == entity._id && r.result) || (r.entity1 != entity._id && !r.result));

        return await DatapointModel.create({
            entity,
            timestamp,
            rating: entity.rating!,
            rd: entity.rd!,
            volatility: entity.volatility!,
            matches: results.length,
            wins: wins.length,
        });
    }
}

const DatapointModel = getModelForClass<typeof Datapoint>(Datapoint);

export { DatapointModel };

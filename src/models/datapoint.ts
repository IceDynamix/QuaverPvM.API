import { getModelForClass, prop, Ref } from "@typegoose/typegoose";
import { Entity } from "./entity";

class Datapoint {
    @prop({ ref: Entity })
    public entity: Ref<Entity>;

    @prop({ default: new Date() })
    public timestamp!: Date;

    @prop()
    public rating!: number;

    @prop()
    public rd!: number;

    @prop()
    public volatility!: number;

    public static async createNewDatapoint(entityId: string, timestamp: Date, rating: number, rd: number, volatility: number) {
        return await DatapointModel.create({ entity: entityId, timestamp, rating, rd, volatility });
    }
}

const DatapointModel = getModelForClass<typeof Datapoint>(Datapoint);

export { DatapointModel };

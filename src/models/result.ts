import { getModelForClass, modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Entity, EntityModel, EntityType } from "./entity";
import { ObjectId } from "mongodb";

type ResultEntityBody = { entityType: EntityType; quaverId: number };

@modelOptions({ schemaOptions: { timestamps: true } })
class Result {
    @prop({ ref: Entity })
    public entity1: Ref<Entity>;

    @prop({ ref: Entity })
    public entity2: Ref<Entity>;

    @prop()
    public result!: boolean; // from the perspective of entity1

    @prop({ default: false })
    public processed?: boolean;

    public static async getResultsContainingId(id: string) {
        const objId = new ObjectId(id);
        return await ResultModel.find({ $or: [{ entity1: objId }, { entity2: objId }] })
            .populate("entity1")
            .populate("entity2")
            .exec();
    }

    public static async createNewResult(entity1Id: string, entity2Id: string, result: boolean): Promise<Result> {
        let entity1Doc = await EntityModel.findById(entity1Id);
        if (!entity1Doc) throw "Provided field entity1 does not exist";
        let entity2Doc = await EntityModel.findById(entity2Id);
        if (!entity2Doc) throw "Provided field entity2 does not exist";
        return await ResultModel.create({ entity1: entity1Doc._id, entity2: entity2Doc._id, result });
    }
}

const ResultModel = getModelForClass<typeof Result>(Result);

export { ResultModel, ResultEntityBody };

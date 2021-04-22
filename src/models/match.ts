import { getModelForClass, modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Entity, EntityModel, EntityType } from "./entity";
import { ObjectId } from "mongodb";
import Glicko from "../glicko/glicko";

const matchTimeout: number = 15 * 60 * 1000; // 15min
const blacklistPastN: number = 50;
const rdWindowFactor: number = 0.5;
const maxQueueSize: number = 15; // Recalculate Glicko after n total games

@modelOptions({ schemaOptions: { timestamps: true } })
class Match {
    @prop({ ref: Entity })
    public entity1: Ref<Entity>;

    @prop({ ref: Entity })
    public entity2: Ref<Entity>;

    @prop({ default: false })
    public result!: boolean; // from the perspective of entity1

    @prop({ default: true })
    public ongoing?: boolean;

    @prop({ default: false })
    public processed?: boolean; // Was used to update player ratings

    public static findEntityResults(entityId: string | ObjectId) {
        if (typeof entityId === "string") entityId = new ObjectId(entityId);
        return MatchModel.find({ $or: [{ entity1: entityId }, { entity2: entityId }] });
    }

    public static findOngoingMatch(entity: Entity) {
        const timeoutStart = new Date(new Date().getTime() - matchTimeout);
        return MatchModel.findOne({
            $and: [
                {
                    $or: [{ entity1: entity }, { entity2: entity }],
                },
                { ongoing: true },
                {
                    createdAt: {
                        $gt: timeoutStart,
                    },
                },
            ],
        });
    }

    public static async matchmaker(entity: Entity) {
        let pastMatches = await Match.findEntityResults(entity._id).exec();
        let playedOpponents = pastMatches
            .sort((a: any, b: any) => a.createdAt - b.createdAt)
            .map((r) => new ObjectId(((r.entity1 == entity._id ? r.entity2 : r.entity1) as any) as string))
            .slice(0, blacklistPastN);

        let opponents = await EntityModel.find({ entityType: "map", _id: { $nin: playedOpponents } }).exec();
        opponents = opponents.filter((opp) => {
            return (
                entity.rating! < opp.rating! + rdWindowFactor * opp.rd! && entity.rating! > opp.rating! - rdWindowFactor * opp.rd!
            );
        });

        let opponent;
        if (opponents.length == 0) {
            let allOpponents = await EntityModel.find({ entityType: "map" }).exec();
            let sorted = allOpponents.sort((a, b) => a.rating! - b.rating!);
            opponent = entity.rating! > 1500 ? sorted[sorted.length - 1] : sorted[0];
        } else {
            opponent = opponents[Math.floor(opponents.length * Math.random())];
        }

        console.log("new match made");

        return await MatchModel.create({ entity1: entity, entity2: opponent, result: false });
    }

    public static async finalizeOngoingMatch(entity: Entity, result: boolean) {
        let ongoing = await Match.findOngoingMatch(entity).exec();
        if (!ongoing) throw "No match ongoing";
        ongoing.result = result;
        ongoing.ongoing = false;
        ongoing.save();

        // run async
        MatchModel.find({ processed: false })
            .count()
            .exec()
            .then((count) => {
                if (count >= maxQueueSize) Glicko.updateAll(true);
            });

        return ongoing;
    }
}

const MatchModel = getModelForClass<typeof Match>(Match);

export { MatchModel, matchTimeout };

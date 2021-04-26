import { DocumentType, getModelForClass, modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Player } from "go-glicko";
import Glicko from "../glicko/glicko";
import { Entity, EntityModel } from "./entity";

type EntityGlickoLink = { entity: Entity; glicko: Player };
type EntityDpDoc = DocumentType<EntityDatapoint>;

@modelOptions({
    schemaOptions: { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } },
})
class EntityDatapoint {
    @prop({ ref: "Entity" }) public entity!: Ref<Entity>; // No idea why it doesn't work without using a string
    @prop() public timestamp!: Date;
    @prop() public rating!: number;
    @prop() public rd!: number;
    @prop() public sigma!: number;
    @prop() public wins!: number;
    @prop() public matches!: number;
    @prop() public overallRank!: number;
    @prop() public typeRank!: number;
    @prop() public overallPercentile!: number;
    @prop() public typePercentile!: number;
    @prop() public fixed!: boolean;

    get glixare(): number {
        return Glicko.glixare(this.rating, this.rd);
    }

    get letterRank(): string {
        if (this.rd > 100) return "z";
        for (const rank of Glicko.ranks()) if (this.overallPercentile <= rank.percentile) return rank.rank;
        return "d";
    }

    public static async getCurrentEntityDatapoint(entity: Entity): Promise<EntityDpDoc> {
        let results = await EntityDatapointModel.find({ entity }).sort({ timestamp: -1 }).populate("entity").exec();
        if (results.length > 0) {
            return results[0];
        } else {
            return await EntityDatapointModel.createFreshDatapoint(entity);
        }
    }

    public static async getAllCurrentDatapoints(entityFilter: any = {}): Promise<EntityDpDoc[]> {
        let allEntities = await EntityModel.find(entityFilter).exec();
        let allDatapoints: EntityDpDoc[] = [];
        for (const entity of allEntities) allDatapoints.push(await EntityDatapointModel.getCurrentEntityDatapoint(entity));
        return allDatapoints.sort((a, b) => b.glixare - a.glixare);
    }

    public static async createFreshDatapoint(entity: Entity, rating: number = 1500, rd: number = 350): Promise<EntityDpDoc> {
        return await EntityDatapointModel.create({
            entity,
            timestamp: new Date(),
            rating,
            rd,
            sigma: 0.06,
            wins: 0,
            matches: 0,
            overallRank: -1,
            typeRank: -1,
            overallPercentile: -1,
            typePercentile: -1,
            fixed: false,
        });
    }

    public static async saveEntityGlicko(entityDp: EntityDpDoc, glickoPlayer: Player, fixed: boolean) {
        entityDp.timestamp = new Date();
        entityDp.rating = glickoPlayer.Rating().R();
        entityDp.rd = glickoPlayer.Rating().RD();
        entityDp.sigma = glickoPlayer.Rating().Sigma();

        // Create copy of document after saving
        if (fixed || entityDp.fixed) delete entityDp._id;
        entityDp.fixed = fixed;
        return await entityDp.save();
    }

    // if only updating after a match, then saveEntityGlicko and saveEntityRanks can be called sequentially
    // but if updating a lot of users, then saveEntityGlicko must be called on all users first, and then saveEntityRanks
    // ranked and rankedOfType must be retrieved outside to ensure performance
    public static async saveEntityRanks(entityDp: EntityDpDoc, ranked: EntityDpDoc[], rankedOfType: EntityDpDoc[]) {
        if (ranked.length == 0) {
            entityDp.overallRank = -1;
            entityDp.overallPercentile = -1;
        } else {
            let higherRanked = ranked.filter((dp) => dp.glixare > entityDp.glixare);
            entityDp.overallRank = higherRanked.length + 1;
            entityDp.overallPercentile = entityDp.overallRank / ranked.length;
        }

        if (rankedOfType.length == 0) {
            entityDp.typeRank = -1;
            entityDp.typePercentile = -1;
        } else {
            let higherRankedTypes = rankedOfType.filter((dp) => dp.glixare > entityDp.glixare);
            entityDp.typeRank = higherRankedTypes.length + 1;
            entityDp.typePercentile = entityDp.typeRank / rankedOfType.length;
        }

        await entityDp.save();
    }
}

type Stats = {
    overall: number;
    map: number;
    user: number;
};

type RankThreshold = {
    ranks: Stats;
    glixare: Stats;
};

class GeneralDatapoint {
    @prop({ default: 0 })
    public userCount!: number;

    @prop({ default: 0 })
    public mapCount!: number;

    @prop({ default: 0 })
    public rankedUserCount!: number;

    @prop({ default: 0 })
    public rankedMapCount!: number;

    @prop({ default: [] })
    public rankThresholds!: RankThreshold[];

    public static async createNewDatapoint() {
        const userCount = await EntityModel.find({ entityType: "user" }).countDocuments().exec();
        const mapCount = await EntityModel.find({ entityType: "map" }).countDocuments().exec();

        const ranked = (await EntityDatapointModel.getAllCurrentDatapoints()).filter((dp) => dp.rd <= 100);

        let rankedMaps = ranked.filter(async (dp) => {
            let entity = await EntityModel.findById(dp.entity).exec();
            return entity && entity.entityType == "map";
        });

        let rankedUsers = ranked.filter(async (dp) => {
            let entity = await EntityModel.findById(dp.entity).exec();
            return entity && entity.entityType == "user";
        });

        const rankThresholds = Glicko.ranks().map((rank) => {
            let percentile = rank.percentile;

            let ranks = {
                overall: ranked.length == 0 ? -1 : Math.floor((ranked.length - 1) * percentile),
                map: rankedMaps.length == 0 ? -1 : Math.floor((rankedMaps.length - 1) * percentile),
                user: rankedUsers.length == 0 ? -1 : Math.floor((rankedUsers.length - 1) * percentile),
            };

            let glixare = {
                overall: ranks["overall"] == -1 ? -1 : ranked[ranks["overall"]].glixare,
                map: ranks["map"] == -1 ? -1 : rankedMaps[ranks["map"]].glixare,
                user: ranks["user"] == -1 ? -1 : rankedUsers[ranks["user"]].glixare,
            };

            return { rank: rank.rank, ranks, glixare };
        });

        GeneralDatapointModel.create({
            userCount,
            mapCount,
            rankedUserCount: rankedUsers.length,
            rankedMapCount: rankedMaps.length,
            rankThresholds,
        });
    }
}

const EntityDatapointModel = getModelForClass<typeof EntityDatapoint>(EntityDatapoint);
const GeneralDatapointModel = getModelForClass<typeof GeneralDatapoint>(GeneralDatapoint);

export { EntityDatapointModel, GeneralDatapointModel, EntityGlickoLink };

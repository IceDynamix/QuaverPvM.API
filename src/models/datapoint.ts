import { DocumentType, getModelForClass, modelOptions, prop, Ref, Severity } from "@typegoose/typegoose";
import { Player } from "go-glicko";
import Glicko from "../glicko/glicko";
import { Entity, EntityModel } from "./entity";
import { MatchModel } from "./match";

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
    @prop() public overallPercentile!: number;
    @prop() public userRank!: number;
    @prop() public userPercentile!: number;
    @prop() public mapRank!: number;
    @prop() public mapPercentile!: number;
    @prop() public fixed!: boolean;

    get letterRank(): string {
        if (this.rd > 100) return "z";
        for (const rank of Glicko.ranks()) if (this.userPercentile <= rank.percentile) return rank.rank;
        return "d";
    }

    public static async getCurrentEntityDatapoint(entity: Entity): Promise<EntityDpDoc> {
        let results = await EntityDatapointModel.find({ entity }).sort({ timestamp: -1 }).populate("entity").exec();
        if (results.length > 0) return results[0];
        return await EntityDatapointModel.createFreshDatapoint(entity);
    }

    public static async getAllCurrentDatapoints(entityFilter: any = {}): Promise<EntityDpDoc[]> {
        let allEntities = await EntityModel.find(entityFilter).exec();
        let allDatapoints: EntityDpDoc[] = [];
        for (const entity of allEntities) allDatapoints.push(await EntityDatapointModel.getCurrentEntityDatapoint(entity));
        return allDatapoints.sort((a, b) => b.rating - a.rating);
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
            overallPercentile: -1,
            userRank: -1,
            userPercentile: -1,
            mapRank: -1,
            mapPercentile: -1,
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
    public static async saveEntityRanks(entityDp: EntityDpDoc, ranked: EntityDpDoc[], rankedUsers: EntityDpDoc[], rankedMaps: EntityDpDoc[]) {
        const stats = (entities: EntityDpDoc[]) => {
            if (entities.length == 0 || entityDp.rd > 100) return { rank: -1, percentile: -1 };
            let higherRanked = entities.filter((dp) => dp.rating > entityDp.rating);
            let rank = higherRanked.length + 1;
            let percentile = Math.max(0, Math.min(1, higherRanked.length / (entities.length - 1)));
            return { rank, percentile };
        };

        const overallStats = stats(ranked);
        entityDp.overallRank = overallStats.rank;
        entityDp.overallPercentile = overallStats.percentile;

        const userStats = stats(rankedUsers);
        entityDp.userRank = userStats.rank;
        entityDp.userPercentile = userStats.percentile;

        const mapStats = stats(rankedMaps);
        entityDp.mapRank = mapStats.rank;
        entityDp.mapPercentile = mapStats.percentile;

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
    rating: Stats;
};

@modelOptions({
    schemaOptions: { timestamps: true, toObject: { getters: true }, toJSON: { virtuals: true } },
    options: { allowMixed: Severity.ALLOW },
})
class GeneralDatapoint {
    @prop({ default: 0 })
    public userCount!: number;

    @prop({ default: 0 })
    public mapCount!: number;

    @prop({ default: 0 })
    public rankedUserCount!: number;

    @prop({ default: 0 })
    public rankedMapCount!: number;

    @prop({ default: 0 })
    public matchCount!: number;

    @prop({ default: [] })
    public rankThresholds!: RankThreshold[];

    public static async createNewDatapoint(): Promise<DocumentType<GeneralDatapoint>> {
        const userCount = await EntityModel.find({ entityType: "user" }).countDocuments().exec();
        const mapCount = await EntityModel.find({ entityType: "map" }).countDocuments().exec();
        const matchCount = await MatchModel.find({ processed: true }).countDocuments().exec();

        const ranked = (await EntityDatapointModel.getAllCurrentDatapoints()).filter((dp) => dp.rd <= 100);

        // Already populated

        // @ts-ignore
        let rankedMaps = ranked.filter((dp) => dp.entity.entityType == "map");
        // @ts-ignore
        let rankedUsers = ranked.filter((dp) => dp.entity.entityType == "user");

        const rankThresholds = Glicko.ranks().map((rank) => {
            let percentile = rank.percentile;

            let ranks = {
                overall: ranked.length == 0 ? -1 : 1 + Math.floor((ranked.length - 1) * percentile),
                map: rankedMaps.length == 0 ? -1 : 1 + Math.floor((rankedMaps.length - 1) * percentile),
                user: rankedUsers.length == 0 ? -1 : 1 + Math.floor((rankedUsers.length - 1) * percentile),
            };

            let rating = {
                overall: ranks.overall == -1 ? -1 : ranked[ranks.overall - 1].rating,
                map: ranks.map == -1 ? -1 : rankedMaps[ranks.map - 1].rating,
                user: ranks.user == -1 ? -1 : rankedUsers[ranks.user - 1].rating,
            };

            return { rank: rank.rank, ranks, rating };
        });

        return await GeneralDatapointModel.create({
            userCount,
            mapCount,
            matchCount,
            rankedUserCount: rankedUsers.length,
            rankedMapCount: rankedMaps.length,
            rankThresholds,
        });
    }
}

const EntityDatapointModel = getModelForClass<typeof EntityDatapoint>(EntityDatapoint);
const GeneralDatapointModel = getModelForClass<typeof GeneralDatapoint>(GeneralDatapoint);

export { EntityDatapoint, EntityDatapointModel, GeneralDatapointModel, EntityGlickoLink };

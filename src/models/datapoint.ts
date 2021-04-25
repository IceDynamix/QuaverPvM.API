import { getModelForClass, modelOptions, mongoose, prop, Ref } from "@typegoose/typegoose";
import { Player } from "go-glicko";
import logging from "../config/logging";
import Glicko from "../glicko/glicko";
import { Entity, EntityModel } from "./entity";
import { MatchModel } from "./match";

type EntityGlickoLink = { entity: Entity; glicko: Player };

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

    get glixare() {
        return Glicko.glixare(this.rating, this.rd);
    }

    get letterRank() {
        if (this.rd > 100) return "z";
        for (const rank of Glicko.ranks()) if (this.overallPercentile <= rank.percentile) return rank.rank;
        return "d";
    }

    public static async getCurrentEntityDatapoint(entity: Entity) {
        let results = await EntityDatapointModel.find({ entity }).sort({ timestamp: -1 }).populate("entity").exec();
        if (results.length > 0) {
            return results[0];
        } else {
            return await EntityDatapointModel.createFreshDatapoint(entity);
        }
    }

    public static async getAllCurrentDatapoints(entityFilter: any = {}) {
        let allEntities = await EntityModel.find(entityFilter).exec();
        let allDatapoints = [];
        for (const entity of allEntities) allDatapoints.push(await EntityDatapointModel.getCurrentEntityDatapoint(entity));
        return allDatapoints.sort((a, b) => b.glixare - a.glixare);
    }

    public static async createFreshDatapoint(entity: Entity, rating: number = 1500, rd: number = 350) {
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
        });
    }

    // Temporary measures to get an updated count instead of reiterating the entire results array again
    public static async pushResult(entity: Entity, win: boolean) {
        let previous = await EntityDatapointModel.getCurrentEntityDatapoint(entity);
        previous.matches++;
        if (win) previous.wins++;
        previous.save();
    }

    public static async createNewDatapoints(timestamp: Date, glickoPlayers: { [key: string]: Player }) {
        const previous = await EntityDatapointModel.getAllCurrentDatapoints();
        const ranked = previous.filter((dp) => dp.rd < 100);
        const sorted = ranked.sort((a, b) => a.glixare - b.glixare);

        let typeLeaderboards = {
            user: ranked.filter((dp) => (dp.entity! as Entity).entityType == "user"), // already populated
            map: ranked.filter((dp) => (dp.entity! as Entity).entityType == "map"),
        };

        for (const entityId in glickoPlayers) {
            let player = glickoPlayers[entityId];
            let newRating = player.Rating().R();
            let newRd = player.Rating().RD();
            let newSigma = player.Rating().Sigma();

            let entity = (await EntityModel.findById(entityId).exec())!;

            // Comparing the objects or the ids without toString() doesn't work for some reason
            // Guaranteed find since new datapoint is created if not found earlier in getAllCurrentDatapoints()
            // Wasted 2 hours of my life
            let previousDp = previous.find((dp: EntityDatapoint) => {
                // @ts-ignore
                return dp.entity._id.toString() == entity.id.toString();
            })!;

            const results = await MatchModel.findEntityResults(entity).exec();
            const wins = results.filter((r) => (r.user != entity) == r.result);

            logging.debug(
                `${entityId} | Rating ${previousDp.rating.toFixed(0)} -> ${newRating.toFixed(0)} | RD ${previousDp.rd?.toFixed(0)} -> ${newRd.toFixed(0)} | Sigma ${previousDp.sigma?.toFixed(
                    4
                )} -> ${newSigma.toFixed(4)}`
            );

            // -1 if unranked
            let overallRank = previousDp.glixare == -1 ? -1 : sorted.map((e) => e.glixare).indexOf(previousDp.glixare) + 1;
            let typeRank = previousDp.glixare == -1 ? -1 : typeLeaderboards[entity.entityType].map((e) => e.glixare).indexOf(previousDp.glixare) + 1;

            let overallPercentile = overallRank == -1 || sorted.length == 0 ? -1 : overallRank / sorted.length;
            let typePercentile = typeRank == -1 || typeLeaderboards[entity.entityType].length == 0 ? -1 : typeRank / typeLeaderboards[entity.entityType].length;

            await EntityDatapointModel.create({
                entity,
                timestamp,
                rating: newRating,
                rd: newRd,
                sigma: newSigma,
                matches: results.length,
                wins: wins.length,
                overallRank,
                typeRank,
                overallPercentile,
                typePercentile,
            });
        }
    }
}

type RankThreshold = {
    ranks: {
        overall: number;
        map: number;
        user: number;
    };
    glixare: {
        overall: number;
        map: number;
        user: number;
    };
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

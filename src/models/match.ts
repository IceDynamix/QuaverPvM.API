import { getModelForClass, modelOptions, prop, Ref } from "@typegoose/typegoose";
import { Entity, EntityModel, EntityType } from "./entity";
import { ObjectId } from "mongodb";
import Glicko from "../glicko/glicko";
import Requester from "../requester/requester";
import config from "../config/config";

const matchTimeout: number = 15 * 60 * 1000; // 15min
const blacklistPastN: number = 10;
const rdWindowFactor: number = 0.5;
const maxQueueSize: number = 15; // Recalculate Glicko after n total games

const modsAreInvalid = (mods: string) => {
    for (const mod of mods.split(", ")) {
        let rateModMatch = mod.match(/(\d\.\d+)x/);
        if (rateModMatch && rateModMatch.length == 2) {
            let rate = parseFloat(rateModMatch[0]);
            if (rate < 1) return true;
        } else {
            if (mod != "Mirror") return true;
        }
    }
    return false;
};

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
        return MatchModel.find({ $or: [{ entity1: entityId }, { entity2: entityId }], ongoing: false });
    }

    public static findOngoingMatch(entity: Entity) {
        const timeoutStart = new Date(new Date().getTime() - matchTimeout);
        return MatchModel.findOne({
            $and: [
                {
                    $or: [{ entity1: entity }, { entity2: entity }],
                },
                { ongoing: true },
                { createdAt: { $gt: timeoutStart } },
            ],
        });
    }

    public static async matchmaker(entity: any) {
        let pastMatches = await Match.findEntityResults(entity._id).exec();
        let playedOpponents = pastMatches
            .sort((a: any, b: any) => a.createdAt - b.createdAt)
            .map((r) => r.entity2)
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
            if (allOpponents.length == 0) throw "No maps added to database";
            let sorted = allOpponents.sort((a, b) => a.rating! - b.rating!);
            opponent = entity.rating! > 1500 ? sorted[sorted.length - 1] : sorted[0];
        } else {
            opponent = opponents[Math.floor(opponents.length * Math.random())];
        }

        return await MatchModel.create({ entity1: entity, entity2: opponent, result: false });
    }

    public static async scanRecentPlays(entity: any) {
        let ongoingMatch = await Match.findOngoingMatch(entity).populate("entity1").populate("entity2").exec();
        if (ongoingMatch == null) throw "No match ongoing";

        let opponent: any = ongoingMatch.entity2;

        let plays = await MatchModel.fetchQuaverUserRecent(entity.quaverId!);

        let recentPlays = plays.filter((play: any) => new Date(play.time) > (ongoingMatch as any).createdAt!);
        if (recentPlays.length == 0)
            return {
                success: false,
                message: "No recent plays made after matching were found",
            };

        let mapPlays = recentPlays.filter((play: any) => play.map.id == opponent.quaverId);
        if (mapPlays.length == 0)
            return {
                success: false,
                message: "Found recent plays, but none match the correct map",
                plays: recentPlays,
            };

        let validModPlays = mapPlays.filter((play: any) => !modsAreInvalid(play.mods_string));
        if (validModPlays.length == 0)
            return {
                success: false,
                message: "Found recent plays on map, but invalid mods were used. All maps must be played on 1.0x or higher.",
                plays: mapPlays,
            };

        let validPlays = validModPlays.filter((play: any) => {
            return play.grade == "S" || play.grade == "SS" || play.grade == "X";
        });
        if (validPlays.length == 0)
            return {
                success: false,
                message: "Found recent plays on map, but required grade was not reached. Submit loss?",
                plays: validModPlays,
            };

        return { success: true, plays: validPlays };
    }

    public static async submitMatch(entity: Entity, resign: boolean = false) {
        let ongoingMatch = await Match.findOngoingMatch(entity).populate("entity1").populate("entity2").exec();
        if (ongoingMatch == null) throw "No match ongoing";

        let response: any;

        if (resign) {
            ongoingMatch.ongoing = false;
            ongoingMatch.save();
            response = { success: true, message: "Successfully submitted a loss" };
        } else {
            response = await MatchModel.scanRecentPlays(entity);
            if (response.success) {
                ongoingMatch.result = true;
                ongoingMatch.ongoing = false;
                ongoingMatch.save();
            }
        }

        Glicko.updateAll(true);

        return new Promise((resolve, reject) => resolve(response));
    }

    static async fetchQuaverUserRecent(id: number | string, mode: number = 1): Promise<any> {
        const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/users/scores/recent?id=${id}&mode=${mode}`);
        if (response.status != 200) return null;
        return response.scores;
    }
}

const MatchModel = getModelForClass<typeof Match>(Match);

export { MatchModel, matchTimeout };

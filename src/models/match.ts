import { getModelForClass, modelOptions, prop, Ref, DocumentType } from "@typegoose/typegoose";
import config from "../config/config";
import logging from "../config/logging";
import Glicko from "../glicko/glicko";
import Requester from "../requester/requester";
import { EntityDatapointModel } from "./datapoint";
import { Entity } from "./entity";

const matchTimeout: number = 10 * 60 * 1000;
const blacklistPastN: number = 10;
const rdWindowFactor: number = 1;

@modelOptions({
    schemaOptions: { toObject: { getters: true }, toJSON: { virtuals: true } },
})
class Match {
    @prop({ ref: "Entity" }) public user!: Ref<Entity>; // No idea why it doesn't work without using a string
    @prop({ ref: "Entity" }) public map!: Ref<Entity>;
    @prop({ default: false }) public result!: boolean | null; // from the perspective of entity1, null = ongoing
    @prop({ default: false }) public processed?: boolean; // Was used to update player ratings
    @prop({ default: new Date() }) public createdAt!: Date;
    @prop() public endsAt!: Date;

    get submissable() {
        return new Date() < this.endsAt;
    }

    public static findEntityResults(entity: Entity, ongoing: Match | null = null) {
        if (ongoing)
            return MatchModel.find({ $or: [{ user: entity }, { map: entity }], _id: { $ne: ongoing } })
                .populate("user")
                .populate("map");
        else
            return MatchModel.find({ $or: [{ user: entity }, { map: entity }] })
                .populate("user")
                .populate("map");
    }

    public static async findOngoingMatch(entity: Entity) {
        let results = await MatchModel.find({
            $and: [{ $or: [{ user: entity }, { map: entity }] }, { result: null }],
        })
            .populate("user")
            .populate("map")
            .exec();

        let filtered = results.filter((m) => m.submissable).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        if (filtered.length > 0) return filtered[0];
        return null;
    }

    public static async matchmaker(user: Entity) {
        let userStats = await EntityDatapointModel.getCurrentEntityDatapoint(user);

        let pastMatches = await Match.findEntityResults(user).exec();
        let playedOpponents = pastMatches
            .sort((a: any, b: any) => b.createdAt - a.createdAt)
            .map((r) => r.map)
            .slice(0, blacklistPastN);

        let mapStats = await EntityDatapointModel.getAllCurrentDatapoints({ entityType: "map", _id: { $nin: playedOpponents } });

        mapStats = mapStats.filter((mapStats) => {
            const upperBound = mapStats.rating + rdWindowFactor * mapStats.rd;
            const lowerBound = mapStats.rating - rdWindowFactor * mapStats.rd;
            return userStats.rating! < upperBound && userStats.rating! > lowerBound;
        });

        if (mapStats.length == 0) throw "No maps in rating range";
        let map: Entity = mapStats[Math.floor(mapStats.length * Math.random())].entity as Entity;
        let createdAt = new Date();
        let endsAt = new Date(createdAt.getTime() + matchTimeout);
        let newMatch = await MatchModel.create({ user, map, result: null, createdAt, endsAt });
        setTimeout(MatchModel.cleanUpTimedOut, matchTimeout);
        return newMatch;
    }

    static async scanRecentPlays(entity: Entity) {
        let ongoingMatch = await Match.findOngoingMatch(entity);
        if (ongoingMatch == null) throw "No match ongoing";

        let opponent: any = ongoingMatch.map;
        let plays = await MatchModel.fetchQuaverUserRecent(entity.quaverId!);

        let recentPlays = plays.filter((play: any) => new Date(play.time) > ongoingMatch!.createdAt);
        if (recentPlays.length == 0)
            return {
                success: false,
                message: "No recent plays found",
            };

        let mapPlays = recentPlays.filter((play: any) => play.map.id == opponent.quaverId);
        if (mapPlays.length == 0)
            return {
                success: false,
                message: `Found recent ${recentPlays.length} play(s), but none match the correct map`,
                plays: recentPlays,
            };

        let validModPlays = mapPlays.filter((play: any) => {
            let whitelisted = ["Mirror", "None"];
            for (const mod of play.mods_string.split(", ")) {
                let usedRate = 1;
                let rateModMatch = mod.match(/(\d\.\d+)x/);
                if (rateModMatch && rateModMatch.length == 2) usedRate = parseFloat(rateModMatch[0]);
                if (usedRate < entity.mapRate) return false;
                if (!rateModMatch && !whitelisted.includes(mod)) return false;
            }
            return true;
        });
        if (validModPlays.length == 0)
            return {
                success: false,
                message: `Found recent plays on map, but invalid mods were used. (${mapPlays[0].mods_string})`,
                plays: mapPlays,
            };

        let validPlays = validModPlays.filter((play: any) => {
            return play.grade == "S" || play.grade == "SS" || play.grade == "X";
        });
        if (validPlays.length == 0)
            return {
                success: false,
                message: `Found recent play on map, but required grade was not reached. (Acc: ${validModPlays[0].accuracy.toFixed(2)}%)`,
                plays: validModPlays,
            };

        return { success: true, message: `Submitted ${validPlays[0].accuracy.toFixed(2)}% score as a win`, plays: validPlays };
    }

    public static async submitMatch(entity: Entity, resign: boolean = false) {
        let ongoingMatch = await Match.findOngoingMatch(entity);
        if (ongoingMatch == null) return new Promise((resolve, reject) => resolve({ success: false, message: "No match ongoing" }));

        let response: any;

        if (resign) {
            ongoingMatch.result = false;
            ongoingMatch.save();
            response = { success: true, message: "Successfully submitted a loss" };
        } else {
            response = await MatchModel.scanRecentPlays(entity);
            if (response.success) {
                ongoingMatch.result = true;
                ongoingMatch.save();
            }
        }

        if (response.success) await Glicko.updateFromResult(ongoingMatch);
        return new Promise((resolve, reject) => resolve(response));
    }

    static async fetchQuaverUserRecent(id: number | string, mode: number = 1): Promise<any> {
        const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/users/scores/recent?id=${id}&mode=${mode}`);
        if (response.status != 200) return null;
        return response.scores;
    }

    public static async cleanUpTimedOut() {
        logging.info("Cleaning up timed out matches");
        let timedOut = await MatchModel.find({ result: null, endsAt: { $lt: new Date() } });
        for (let match of timedOut) Glicko.updateFromResult(match);
    }
}

const MatchModel = getModelForClass<typeof Match>(Match);

export { MatchModel, Match };

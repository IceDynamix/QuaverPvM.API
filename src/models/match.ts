import {DocumentType, getModelForClass, modelOptions, prop, Ref} from "@typegoose/typegoose";
import config from "../config/config";
import logging from "../config/logging";
import Glicko from "../glicko/glicko";
import Requester from "../requester/requester";
import {EntityDatapointModel} from "./datapoint";
import {Entity, EntityModel} from "./entity";

const matchTimeout: number = 10 * 60 * 1000;
const dupeProtectLastN: number = 10;
const rdWindowFactor: number = 1;

@modelOptions({
    schemaOptions: {toObject: {getters: true}, toJSON: {getters: true}},
})
class Match {
    @prop({ref: "Entity"}) public user!: Ref<Entity>; // No idea why it doesn't work without using a string
    @prop({ref: "Entity"}) public map!: Ref<Entity>;
    @prop({default: false}) public result!: boolean | null; // from the perspective of entity1, null = ongoing
    @prop({default: false}) public processed?: boolean; // Was used to update player ratings
    @prop({default: new Date()}) public createdAt!: Date;
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
            $and: [{ $or: [{ user: entity }, { map: entity }] }, { result: null }, { processed: false }],
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
        let opponentIds = pastMatches
            .sort((a: any, b: any) => b.createdAt - a.createdAt)
            .map((r) => r.map)
            .slice(0, dupeProtectLastN);

        let opponents = await EntityModel.find({ entityType: "map", _id: { $in: opponentIds } }).exec();
        let blacklistedQuaverIds = opponents.map((o) => o.quaverId);

        let mapStats = await EntityDatapointModel.getAllCurrentDatapoints({ entityType: "map", quaverId: { $nin: blacklistedQuaverIds } });
        mapStats = mapStats.filter((stats) => {
            const upperBound = stats.rating + rdWindowFactor * stats.rd;
            const lowerBound = stats.rating - rdWindowFactor * stats.rd;
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

    static async scanRecentPlays(ongoingMatch: DocumentType<Match>, entity: Entity) {
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
                message: `Found ${recentPlays.length} recent play(s), but none match the correct map`,
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
        if (ongoingMatch == null) return {success: false, message: "No match ongoing? This shouldn't happen"};

        // Set temporary result to prevent additional requests during scanning from having any effect
        ongoingMatch.result = false;
        await ongoingMatch.save();

        let response: any;
        if (resign) {
            response = { success: true, message: "Successfully submitted a loss" };
        } else {
            response = await MatchModel.scanRecentPlays(ongoingMatch, entity);
            ongoingMatch.result = response.success ? true : null; // open for another scan
            await ongoingMatch.save();
        }

        if (response.success) await Glicko.updateFromResult(ongoingMatch);
        return response;
    }

    static async fetchQuaverUserRecent(id: number | string, mode: number = 1): Promise<any> {
        const response: any = await Requester.GET(`${config.apiBaseUrl}/v1/users/scores/recent?id=${id}&mode=${mode}&limit=5`);
        if (response.status != 200) return null;
        return response.scores;
    }

    public static async cleanUpTimedOut() {
        logging.info("Cleaning up timed out matches");
        let timedOut = await MatchModel.find({ result: null, endsAt: { $lt: new Date() }, processed: false });
        for (let match of timedOut) await Glicko.updateFromResult(match);
    }
}

const MatchModel = getModelForClass<typeof Match>(Match);

export { MatchModel, Match };

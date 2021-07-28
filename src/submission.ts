import { Match } from "@prisma/client";
import QuaverApi from "./quaverApi";

const whitelistedMods = ["Mirror", "None"];
const validGrades = ["S", "SS", "X"];

export default class Submission {
    private static async scanRecentUserScores(match: Match): Promise<{ success: Boolean; message: string }> {
        let scores = await QuaverApi.getRecentUserScores(match.userId);

        scores = scores.filter((score: any) => new Date(score.time) > match.createdAt);
        if (scores.length === 0)
            return {
                success: false,
                message: "No recent scores found",
            };

        scores = scores.filter((score: any) => score.map.id == match.mapId);
        if (scores.length === 0)
            return {
                success: false,
                message: `Found ${scores.length} recent score(s), but none match the correct map`,
            };

        scores = scores.filter((score: any) => Submission.scoreIsValid(score, match.mapRate));
        if (scores.length === 0)
            return {
                success: false,
                message: `Found recent scores on map, but invalid mods were used. (${scores[0].mods_string})`,
            };

        scores = scores.filter((score: any) => validGrades.includes(score.grade));
        if (scores.length === 0)
            return {
                success: false,
                message: `Found recent score on map, but required grade was not reached. (${scores[0].accuracy.toFixed(2)}%)`,
            };

        return {
            success: true,
            message: `Submitted ${scores[0].accuracy.toFixed(2)}% score as a win`,
        };
    }

    private static scoreIsValid(score: any, mapRate: number): boolean {
        for (const mod of score.mods_string.split(", ")) {
            let scoreedRate = 1;

            let rateModMatch = mod.match(/(\d\.\d+)x/);
            if (rateModMatch && rateModMatch.length == 2) {
                scoreedRate = parseFloat(rateModMatch[0]);
            }

            // Scoreed rate was too low
            if (scoreedRate < mapRate) return false;
            // Included invalid mod
            if (!rateModMatch && !whitelistedMods.includes(mod)) return false;
        }
        return true;
    }
}

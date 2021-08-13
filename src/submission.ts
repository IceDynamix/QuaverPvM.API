import { Match, User, MatchResult } from "@prisma/client";

import prisma from "./config/prisma";
import Matching from "./matching";
import QuaverApi from "./quaver/quaverApi";
import Ranking from "./ranking";

const whitelistedMods = ["Mirror", "None"];
const validGrades = ["S", "SS", "X"];

type SubmissionResponse = { success: Boolean; message: string };

export default class Submission {
    public static async submitMatch(user: User, resign: boolean = false): Promise<SubmissionResponse> {
        let match = await Matching.getOngoingMatch(user);
        if (!match) return { success: false, message: "No match ongoing? This shouldn't happen" };

        const updateResult = async (result: MatchResult) =>
            (match = await prisma.match.update({
                where: { matchId: match!.matchId },
                data: { result },
            }));

        // Temporarily set to non-ongoing value to prevent additional submissions from having any effect
        await updateResult("PROCESSING");

        let response: SubmissionResponse;
        if (resign === true) {
            response = { success: true, message: "Successfully submitted a loss" };
            await updateResult("RESIGN");
        } else {
            response = await Submission.scanRecentUserScores(match);
            if (response.success) await updateResult("WIN");
            else await updateResult("ONGOING");
        }

        if (response.success) await Ranking.handleMatchResult(match);

        return response;
    }

    private static async scanRecentUserScores(match: Match): Promise<SubmissionResponse> {
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
            let playedRate = 1;

            let rateModMatch = mod.match(/(\d\.\d+)x/);
            if (rateModMatch && rateModMatch.length == 2) {
                playedRate = parseFloat(rateModMatch[0]);
            }

            // Played rate was too low
            if (playedRate < mapRate) return false;
            // Included invalid mod
            if (!rateModMatch && !whitelistedMods.includes(mod)) return false;
        }
        return true;
    }
}

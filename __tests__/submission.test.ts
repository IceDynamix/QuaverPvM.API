import { Match } from ".prisma/client";
import Submission from "../src/submission";

describe("Score Mod Validation", () => {
    const score = {
        id: 31903018,
        time: "2021-11-19T05:23:19.086Z",
        mode: 1,
        mods: 2147483712,
        mods_string: "1.1x, Mirror",
        performance_rating: 40.55875664891827,
        personal_best: false,
        is_donator_score: false,
        total_score: 917104,
        accuracy: 97.07412719726562,
        grade: "S",
        max_combo: 1269,
        count_marv: 4824,
        count_perf: 1321,
        count_great: 95,
        count_good: 51,
        count_okay: 23,
        count_miss: 30,
        scroll_speed: 327,
        tournament_game_id: 0,
        ratio: 3.651778955336866,
        map: {
            id: 27763,
            mapset_id: 3579,
            md5: "19f79d845653817c21ab385a75134cf4",
            artist: "UNDEAD CORPORATION",
            title: "The Empress",
            difficulty_name: "Extra Boss",
            creator_id: 7234,
            creator_username: "11Bit",
            ranked_status: 2,
        },
    };

    test("Allow for uprate and mirror", () => {
        expect(Submission.scoreIsValid(score, 1.0)).toBeTruthy();
    });

    test("Allow for mirror", () => {
        score.mods_string = "Mirror";
        expect(Submission.scoreIsValid(score, 1.0)).toBeTruthy();
    });

    test("Allow for mirror on uprated map", () => {
        score.mods_string = "1.1x, Mirror";
        expect(Submission.scoreIsValid(score, 1.1)).toBeTruthy();
    });

    test("Allow for Nomod", () => {
        score.mods_string = "None";
        expect(Submission.scoreIsValid(score, 1.0)).toBeTruthy();
    });

    test("Allow for uprate", () => {
        score.mods_string = "1.1x";
        expect(Submission.scoreIsValid(score, 1.0)).toBeTruthy();
    });

    test("Allow for NSV", () => {
        score.mods_string = "NSV";
        expect(Submission.scoreIsValid(score, 1.0)).toBeTruthy();
    });

    test("Allow for NSV on uprated map", () => {
        score.mods_string = "1.1x, NSV";
        expect(Submission.scoreIsValid(score, 1.1)).toBeTruthy();
    });

    test("Allow for NSV on uprated map with mirror", () => {
        score.mods_string = "1.1x, NSV, Mirror";
        expect(Submission.scoreIsValid(score, 1.1)).toBeTruthy();
    });

    test("Reject for invalid rate", () => {
        score.mods_string = "0.9x";
        expect(Submission.scoreIsValid(score, 1.0)).toBeFalsy();
    });

    test("Reject for invalid mod", () => {
        score.mods_string = "NLN";
        expect(Submission.scoreIsValid(score, 1.0)).toBeFalsy();
    });
});

describe("Score Matching Validation", () => {
    const match: Match = {
        matchId: 1,
        createdAt: new Date("2021-11-19T05:21:19.086Z"),
        mapId: 27763,
        mapRate: 1.1,
        result: "PROCESSING",
        userId: 1,
    };

    const score = {
        id: 31903018,
        time: "2021-11-19T05:23:19.086Z",
        mode: 1,
        mods: 2147483712,
        mods_string: "1.1x, Mirror",
        performance_rating: 40.55875664891827,
        personal_best: false,
        is_donator_score: false,
        total_score: 917104,
        accuracy: 97.07412719726562,
        grade: "S",
        max_combo: 1269,
        count_marv: 4824,
        count_perf: 1321,
        count_great: 95,
        count_good: 51,
        count_okay: 23,
        count_miss: 30,
        scroll_speed: 327,
        tournament_game_id: 0,
        ratio: 3.651778955336866,
        map: {
            id: 27763,
            mapset_id: 3579,
            md5: "19f79d845653817c21ab385a75134cf4",
            artist: "UNDEAD CORPORATION",
            title: "The Empress",
            difficulty_name: "Extra Boss",
            creator_id: 7234,
            creator_username: "11Bit",
            ranked_status: 2,
        },
    };

    test("Regular pass", () => {
        expect(Submission.validateRecentUserScores(match, [score]).success).toBeTruthy();
    });

    test("Time check", async () => {
        const modifiedScore = { ...score, time: "2021-11-19T05:19:19.086Z" };
        expect(Submission.validateRecentUserScores(match, [modifiedScore]).success).toBeFalsy();
    });

    test("Map check", async () => {
        const modifiedScore = { ...score };
        modifiedScore.map.id += 1;
        expect(Submission.validateRecentUserScores(match, [modifiedScore]).success).toBeFalsy();
    });

    test("Mod check", async () => {
        const modifiedScore = { ...score, mods_string: "NLN" };
        expect(Submission.validateRecentUserScores(match, [modifiedScore]).success).toBeFalsy();
    });

    test("Grade check", async () => {
        const modifiedScore = { ...score, grade: "A" };
        expect(Submission.validateRecentUserScores(match, [modifiedScore]).success).toBeFalsy();
    });
});

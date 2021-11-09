import config from "./config";

import prisma from "./prisma";
import redis from "./redis";

import session from "express-session";
const redisStore = require("connect-redis")(session);
import cors from "cors";

import passport from "passport";

import express, { Request, Response } from "express";
import UserController from "../controller/user";
import axios from "axios";
import OAuth2Strategy from "passport-oauth2";
import Ranking from "../ranking";
import QuaverApi from "../quaver/quaverApi";
import MapController from "../controller/map";
import LeaderboardController from "../controller/leaderboard";
import MatchController from "../controller/match";
import StatsController from "../controller/stats";
const app = express();

export default class Server {
    constructor() {
        Server.setupSession();
        Server.setupRequestLogging();
        Server.setupPassport();
        Server.setupBodyParsing();
        Server.setupRoutes();
        Server.setupErrorHandling();

        app.listen(config.port, () => console.info(`Server is running on port ${config.port}`));
    }

    static setupSession() {
        app.use(
            session({
                secret: config.secret,
                name: "session",
                saveUninitialized: true,
                resave: true,
                cookie: {
                    secure: false,
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
                    // domain: ".icedynamix.moe",
                },
                store: new redisStore({ client: redis }),
            })
        );
    }

    static setupRequestLogging() {
        app.use((req: express.Request, res: express.Response, next: Function) => {
            res.on("finish", () => console.info(`${req.method} ${req.url} - [${res.statusCode}]`));
            next();
        });
    }

    static setupPassport() {
        passport.serializeUser((user: any, done) => done(null, user.userId));
        passport.deserializeUser(async (id: number, done) => prisma.user.findUnique({ where: { userId: id } }).then((user) => done(null, user)));

        passport.use(
            new OAuth2Strategy(
                {
                    authorizationURL: config.quaverBaseUrl + "/oauth2/authorize",
                    tokenURL: config.quaverBaseUrl + "/oauth2/token",
                    clientID: config.quaverOauthClient,
                    clientSecret: config.quaverOauthSecret,
                    callbackURL: config.selfUrl + "/auth/quaver/callback",
                },
                async function (accessToken: any, refreshToken: any, profile: any, done: Function) {
                    try {
                        const options = { headers: { Authorization: "Bearer " + config.quaverOauthSecret } };
                        const response = await axios.post(config.quaverBaseUrl + `/oauth2/me`, { code: accessToken }, options);
                        const userId = response.data.user.id;

                        const existing = await prisma.user.findUnique({ where: { userId } });
                        if (existing && !existing.banned) return done(null, existing);

                        const quaverData = await QuaverApi.getFullUser(userId);
                        const rating = Ranking.qrToGlicko((quaverData.keys4.stats.overall_performance_rating * 0.9) / 20);

                        const newUser = await prisma.user.create({
                            data: {
                                userId,
                                username: quaverData.info.username,
                                rating: rating,
                                avatarUrl: quaverData.info.avatar_url,
                            },
                        });

                        done(null, newUser);
                    } catch (err) {
                        console.error(err);
                        done(err);
                    }
                }
            )
        );

        app.use(passport.initialize());
        app.use(passport.session());
    }

    static setupBodyParsing() {
        app.use(
            cors({
                origin: config.clientBaseUrl,
                methods: ["GET", "POST"],
                credentials: true,
            })
        );
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());
    }

    static async requireLogin(req: any, res: any, next: any): Promise<void> {
        if (!req.user) return res.json({ message: "Not logged in!" });
        next();
    }

    static setupRoutes() {
        app.get("/me", Server.requireLogin, UserController.selfGET);
        app.get("/user", UserController.GET);
        app.get("/user/matches", UserController.userMatchesGET);
        app.get("/user/bestwins", UserController.userBestWinsGET);
        app.get("/map", MapController.GET);
        app.get("/map/random", MapController.randomGET);
        app.get("/leaderboard", LeaderboardController.GET);
        app.get("/stats", StatsController.GET);

        app.get("/match", MatchController.GET);
        app.get("/match/new", Server.requireLogin, MatchController.newGET);
        app.get("/match/ongoing", Server.requireLogin, MatchController.ongoingGET);
        app.post("/match/submit", Server.requireLogin, MatchController.submitPOST);

        app.get("/logout", (req: Request, res: Response) => {
            req.logout();
            res.redirect(config.clientBaseUrl);
        });

        app.get("/auth/quaver", passport.authenticate("oauth2"), (req, res) => {});
        app.get("/auth/quaver/callback", passport.authenticate("oauth2"), (req, res) => {
            res.redirect(config.clientBaseUrl);
        });

        app.get("/", (req: Request, res: Response) => res.json({ message: "Welcome to the QuaverPvM API!" }));
        app.get("*", (req: Request, res: Response) => res.status(404).json({ message: "Not found" }));
    }

    static setupErrorHandling() {
        app.use((err: Error, req: Request, res: Response, next: Function) => {
            console.error(err, err);
            res.status(500).json({ message: err.message, err });
        });
    }
}

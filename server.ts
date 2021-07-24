import config from "./src/config";

import { PrismaClient, User } from "@prisma/client";
const prisma = new PrismaClient({
    log: ["query", "info", `warn`, `error`],
    errorFormat: "pretty",
});

import redis from "redis";
import { promisify } from "util";
const redisClient = redis.createClient();
const redisGetAsync = promisify(redisClient.get).bind(redisClient);
const redisSetExAsync = promisify(redisClient.setex).bind(redisClient);

redisClient.on("error", (err) => {
    console.log("Redis error: ", err);
});

import session from "express-session";
const redisStore = require("connect-redis")(session);
import cors from "cors";

import passport from "passport";

import express, { Request, Response } from "express";
import UserController from "./src/controller/user";
import axios from "axios";
import OAuth2Strategy from "passport-oauth2";
import Glicko from "./src/glicko";
import QuaverApi from "./src/quaverApi";
import MapController from "./src/controller/map";
const app = express();

class Server {
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
                store: new redisStore({ client: redisClient }),
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

                        const quaverData = await QuaverApi.getQuaverUser(userId);
                        const rating = Glicko.qrToGlicko((quaverData.keys4.stats.overall_performance_rating * 0.9) / 20);

                        const newUser = await prisma.user.create({
                            data: {
                                userId,
                                username: quaverData.info.username,
                                rating: rating,
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

    static setupRoutes() {
        app.get("/me", UserController.selfGET);
        app.get("/user", UserController.GET);
        app.get("/map", MapController.GET);

        app.get("/logout", (req: Request, res: Response) => {
            req.logout();
            res.redirect(config.selfUrl);
        });

        app.get("/auth/quaver", passport.authenticate("oauth2"), (req, res) => {});
        app.get("/auth/quaver/callback", passport.authenticate("oauth2"), (req, res) => {
            res.redirect(config.selfUrl);
        });

        app.get("/", (req: Request, res: Response) => res.json({ message: "Welcome to the QuaverPvM API!", session: req.session }));
        app.get("*", (req: Request, res: Response) => res.status(404).json({ message: "Not found" }));
    }

    static setupErrorHandling() {
        app.use((err: Error, req: Request, res: Response, next: Function) => {
            console.error(err, err);
            res.status(500).json({ message: err.message, err });
        });
    }
}

async function main() {
    new Server();
}

main().finally(() => prisma.$disconnect());

export { prisma, redisClient, redisGetAsync, redisSetExAsync };

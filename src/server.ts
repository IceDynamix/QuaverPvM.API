require("dotenv").config();

import axios from "axios";
import MongoStore from "connect-mongo";
import cors from "cors";
import express, { Request, Response } from "express";
import session from "express-session";
import passport from "passport";
import config from "./config/config";
import { startCrons } from "./config/cron";
import Database from "./config/database";
import logging from "./config/logging";
import DatapointController from "./controller/datapoint";
import EntityController from "./controller/entity";
import MatchController from "./controller/match";
import { EntityDoc, EntityModel } from "./models/entity";
import { Strategy as OAuth2Strategy } from "passport-oauth2";

const app = express();

const corsOptions = {
    origin: config.clientBaseUrl,
    methods: ["GET", "POST"],
    credentials: true,
};

passport.serializeUser((user: EntityDoc, done) => done(null, user.id));

passport.deserializeUser((id, done) =>
    EntityModel.findById(id)
        .exec()
        .then((user) => done(null, user))
);

passport.use(
    new OAuth2Strategy(
        {
            authorizationURL: config.quaverBaseUrl + "/oauth2/authorize",
            tokenURL: config.quaverBaseUrl + "/oauth2/token",
            clientID: config.quaverOauthClient,
            clientSecret: config.quaverOauthSecret,
            callbackURL: config.selfUrl + "/auth/quaver/callback",
        },
        async function (accessToken, refreshToken, profile, done) {
            try {
                let options = { headers: { Authorization: "Bearer " + config.quaverOauthSecret } };
                let response = await axios.post(config.quaverBaseUrl + `/oauth2/me`, { code: accessToken }, options);
                let quaverId = response.data.user.id;

                let existing = await EntityModel.findOne({ quaverId, entityType: "user" });
                if (existing) return done(null, existing);
                let newUser = await EntityModel.createNewUser(quaverId);
                done(null, newUser);
            } catch (err) {
                logging.error(err);
                done(err);
            }
        }
    )
);

class Server {
    constructor() {
        // Connect to Mongo
        Database.connect();

        startCrons();

        // Request logging
        app.use((req, res, next) => {
            res.on("finish", () => {
                logging.info(`${req.method} ${req.url} - [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`);
            });
            next();
        });

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
                store: MongoStore.create({ mongoUrl: config.databaseUrl }),
            })
        );

        app.use(passport.initialize());
        app.use(passport.session());

        app.use(cors(corsOptions));
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());

        // Routes

        app.get("/me", EntityController.selfGET);
        app.get("/entities", EntityController.GET);

        app.get("/match", MatchController.GET);
        app.post("/match", MatchController.POST);

        app.get("/results", MatchController.resultsGET);
        app.post("/results", MatchController.resultsPOST);

        app.get("/history", DatapointController.generalGET);
        app.get("/entity/stats/:id", DatapointController.entitySingleGET);
        app.get("/entity/history/:id", DatapointController.entityFullGET);

        app.get("/leaderboard", DatapointController.leaderboardGET);

        app.get("/logout", (req: Request, res: Response) => {
            req.logout();
            return res.redirect(config.clientBaseUrl);
        });

        app.get("/auth/quaver", passport.authenticate("oauth2"), (req, res) => {});
        app.get("/auth/quaver/callback", passport.authenticate("oauth2"), (req, res) => {
            res.redirect(config.clientBaseUrl);
        });

        app.get("/", (req: Request, res: Response) => res.json({ message: "Welcome to the QuaverPvM API!" }));

        app.get("*", (req: Request, res: Response) => res.status(404).json({ message: "Not found" }));

        app.listen(config.port, () => logging.info(`Server is running on port ${config.port}`));
    }
}

new Server();

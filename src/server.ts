require("dotenv").config();

import Database from "./config/database";
import { EntityModel } from "./models/entity";

import express from "express";
import { Request, Response } from "express";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import LoginController from "./controller/login";
import cors from "cors";

import config from "./config/config";
import logging from "./config/logging";
import EntityController from "./controller/entity";
import MatchController from "./controller/match";
import DatapointController from "./controller/datapoint";
import { MatchModel } from "./models/match";

const NAMESPACE = "Server";
const app = express();

const corsOptions = {
    origin: config.clientBaseUrl,
};

class Server {
    constructor() {
        // Connect to Mongo
        Database.connect();

        // Request logging
        app.use((req, res, next) => {
            logging.info(NAMESPACE, `[${req.method}] '${req.url}' - IP: [${req.socket.remoteAddress}]`);

            res.on("finish", () => {
                logging.info(
                    NAMESPACE,
                    `[${req.method}] '${req.url}' - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`
                );
            });

            next();
        });

        // Request body parsing
        // app.use(cors(corsOptions));
        app.use(cors());
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());

        app.use(
            session({
                secret: config.secret,
                name: "session",
                saveUninitialized: true,
                resave: true,
                cookie: {
                    secure: false,
                    maxAge: 30 * 24 * 60 * 60 * 1000, // 30d
                },
                store: MongoStore.create({ mongoUrl: config.databaseUrl }),
            })
        );

        app.use(passport.initialize());
        app.use(passport.session());

        passport.serializeUser((user: any, done) => done(null, user._id));

        passport.deserializeUser((id, done) =>
            EntityModel.findById(id)
                .exec()
                .then((user) => done(null, user))
        );

        // Routes
        app.get("/me", EntityController.selfGET);
        app.get("/entities", EntityController.GET);

        app.get("/match", MatchController.GET);
        app.post("/match", MatchController.POST);
        app.get("/results", MatchController.results);

        app.get("/datapoints", DatapointController.GET);

        app.get("/login", LoginController.login);
        app.get("/logout", LoginController.logout);
        app.get("/verify", LoginController.verify);

        app.get("/", (req: Request, res: Response) => res.json({ message: "Welcome to the QuaverPvM API!" }));

        app.get("*", (req: Request, res: Response) => res.status(404).json({ message: "Not found" }));

        app.listen(config.port, () => logging.info(NAMESPACE, `Server is running on port ${config.port}`));
    }
}

new Server();

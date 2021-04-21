require("dotenv").config();

import Database from "./config/database";
import { EntityModel } from "./models/entity";

import express from "express";
import apiRouter from "./routes/api";
import passport from "passport";
import session from "express-session";
import MongoStore from "connect-mongo";
import LoginController from "./controller/login";
import cors from "cors";

import config from "./config/config";
import logging from "./config/logging";

const NAMESPACE = "Server";
const app = express();

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
        app.use(express.urlencoded({ extended: true }));
        app.use(express.json());
        app.use(cors());

        app.use(
            session({
                secret: config.jwtSecret,
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

        passport.serializeUser(function(user: any, done) {
            done(null, user._id);
        });

        passport.deserializeUser(function(id, done) {
            EntityModel.findById(id)
                .exec()
                .then((user) => {
                    done(null, user);
                });
        });

        // Routes
        app.use("/api", apiRouter);
        app.get("/login", LoginController.login);
        app.get("/logout", LoginController.logout);
        app.get("/verify", LoginController.verify);
        app.get("/", function(req, res) {
            res.json(req.session);
        });

        app.listen(config.port, () => logging.info(NAMESPACE, `Server is running on port ${config.port}`));
    }
}

new Server();

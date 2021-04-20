require("dotenv").config();

import express from "express";
import apiRouter from "./routes/api";

import bodyParser from "body-parser";

import config from "./config/config";
import logging from "./config/logging";

import Database from "./config/database";

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
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());

        // Routes
        app.use("/api", apiRouter);

        app.listen(config.port, () => logging.info(NAMESPACE, `Server is running on port ${config.port}`));
    }
}

new Server();

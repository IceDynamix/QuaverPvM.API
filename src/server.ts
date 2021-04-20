require("dotenv").config();

import express from "express";
import EntityController from "./controllers/entityController";
import ResultController from "./controllers/resultController";

import bodyParser from "body-parser";

import config from "./config/config";
import logging from "./config/logging";

import Database from "./config/database";

const NAMESPACE = "Server";
const router = express();

class Server {
    constructor() {
        // Connect to Mongo
        Database.connect();

        // Request logging
        router.use((req, res, next) => {
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
        router.use(bodyParser.urlencoded({ extended: true }));
        router.use(bodyParser.json());

        // Routes
        router.get("/users", EntityController.allUsers);
        router.get("/users/:id", EntityController.getUser);
        router.post("/users/:id", EntityController.createUser);

        router.get("/maps", EntityController.allMaps);
        router.get("/maps/:id", EntityController.getMap);
        router.post("/maps/:id", EntityController.createMap);

        router.get("/results", ResultController.allResults);
        router.get("/results/:id", ResultController.getResult);
        router.get("/results/user/:id", ResultController.getUserResults);
        router.get("/results/map/:id", ResultController.getMapResults);
        router.post("/results/", ResultController.createResult);

        router.listen(config.port, () => logging.info(NAMESPACE, `Server is running on port ${config.port}`));
    }
}

new Server();

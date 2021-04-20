require("dotenv").config();

import express from "express";
import UserController from "./controllers/userController";

import bodyParser from "body-parser";

import config from "./config/config";
import logging from "./config/logging";

import mongoose from "mongoose";

const NAMESPACE = "Server";
const router = express();

class Server {
    constructor() {
        // Connect to Mongo
        mongoose
            .connect(config.databaseUrl, config.mongoOptions)
            .then((result) => {
                logging.info(NAMESPACE, "Connected to MongoDB");
            })
            .catch((error) => {
                logging.error(NAMESPACE, error.message, error);
            });

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
        router.get("/users", UserController.allUsers);
        router.get("/users/:id", UserController.getUser);
        router.post("/users/:id", UserController.addUser);

        router.listen(config.port, () => logging.info(NAMESPACE, `Server is running on port ${config.port}`));
    }
}

new Server();

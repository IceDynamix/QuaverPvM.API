import config from "./src/config";
import quaverApi from "./src/quaverApi";

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

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

import express, { Request, Response } from "express";
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

    static setupPassport() {}

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

async function main() {
    new Server();
}

main().finally(() => prisma.$disconnect());

export { prisma, redisClient, redisGetAsync, redisSetExAsync };

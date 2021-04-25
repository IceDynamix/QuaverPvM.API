import { mongoose } from "@typegoose/typegoose";
import config from "./config";
import logging from "./logging";

export default class Database {
    public static connect(): void {
        mongoose
            .connect(config.databaseUrl, config.mongoOptions)
            .then((result) => {
                logging.info("Connected to MongoDB");
            })
            .catch((error) => {
                logging.error(error.message, error);
            });
    }
}

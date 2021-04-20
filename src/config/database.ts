import { mongoose } from "@typegoose/typegoose";
import config from "./config";
import logging from "./logging";

const NAMESPACE: string = "DATABASE";

export default class Database {
    public static connect(): void {
        mongoose
            .connect(config.databaseUrl, config.mongoOptions)
            .then((result) => {
                logging.info(NAMESPACE, "Connected to MongoDB");
            })
            .catch((error) => {
                logging.error(NAMESPACE, error.message, error);
            });
    }
}

import { Response } from "express";
import logging from "../config/logging";

export default class ResponseHandler {
    public static async handle(promise: Promise<Array<any> | any>, res: Response, status: number = 200) {
        try {
            let result = await promise;
            res.status(status).json(result);
        } catch (err) {
            ResponseHandler.handleError(err, res);
        }
    }

    static handleError(err: Error, res: Response) {
        logging.error(err.message, err);
        res.status(500).json({ message: err.message, err });
    }
}

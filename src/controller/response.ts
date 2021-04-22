import { Request, Response } from "express";
import config from "../config/config";

export default class ResponseHandler {
    public static async handle(
        promise: Promise<Array<any> | any>,
        req: Request,
        res: Response,
        status: number = 200,
        protectedOrigin: boolean = false
    ) {
        if (protectedOrigin) {
            res.header("Access-Control-Allow-Origin", config.clientBaseUrl);
        } else {
            res.header("Access-Control-Allow-Origin", req.get("Origin"));
        }
        res.header("Access-Control-Allow-Credentials", "true");
        res.header("Access-Control-Expose-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        res.header("Access-Control-Allow-Methods", "GET,POST");
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        try {
            let result = await promise;
            if (Array.isArray(result)) ResponseHandler.handleArrayResponse(result, res);
            else res.status(status).json(result);
        } catch (err) {
            ResponseHandler.handleError(err, res);
        }
    }

    static handleArrayResponse(results: Array<any>, res: Response) {
        res.status(200).json({ count: results.length, results });
    }

    static handleError(err: Error, res: Response) {
        res.status(500).json({ message: err.message, err });
    }
}

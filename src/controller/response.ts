import { Response } from "express";

export default class ResponseHandler {
    public static async handle(promise: Promise<Array<any> | any>, res: Response, status: number = 200) {
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

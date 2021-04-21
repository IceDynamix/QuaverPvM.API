import { ResultModel } from "../models/result";
import { Request, Response } from "express";
import ResponseHandler from "./response";

export default class ResultController {
    public static GET(req: Request, res: Response): void {
        const { id, entity, populate } = req.query;

        let method;
        if (id) method = ResultModel.find({ _id: id });
        else if (entity) method = ResultModel.findEntityResults(entity.toString());
        else method = ResultModel.find({});

        if (populate)
            ResponseHandler.handle(
                method
                    .populate("entity1")
                    .populate("entity2")
                    .exec(),
                res
            );
        else ResponseHandler.handle(method.exec(), res);
    }

    public static POST(req: Request, res: Response): void {
        if (!req.user) {
            res.status(401).json({ message: "Not logged in" });
            return;
        }

        const entity1 = (req.user as any)._id;
        const { entity: entity2, result }: { entity: string; result: boolean } = req.body;
        if (!entity2) {
            res.status(500).json({ message: "Entity field was not set" });
            return;
        }

        ResponseHandler.handle(ResultModel.createNewResult(entity1, entity2, result), res, 201);
    }
}

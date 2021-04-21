import { ResultModel } from "../models/result";
import { Request, Response } from "express";

export default class ResultController {
    public static allResults(req: Request, res: Response): void {
        ResultModel.find({})
            .populate("entity1")
            .populate("entity2")
            .exec()
            .then((results) =>
                res.status(200).json({
                    count: results.length,
                    results,
                })
            )
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static getResult(req: Request, res: Response): void {
        ResultModel.findById(req.params.id)
            .populate("entity1")
            .populate("entity2")
            .exec()
            .then((result) => res.status(200).json(result))
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static getEntityResults(req: Request, res: Response): void {
        ResultModel.getResultsContainingId(req.params.id)
            .then((results) =>
                res.status(200).json({
                    count: results.length,
                    results,
                })
            )
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static createResult(req: Request, res: Response): void {
        const { entity1, entity2, result }: { entity1: string; entity2: string; result: boolean } = req.body;

        if (!entity1 || !entity2) {
            res.status(500).json({ message: "An entity field was not set" });
            return;
        }

        ResultModel.createNewResult(entity1, entity2, result)
            .then((result) => res.status(201).json(result))
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }
}

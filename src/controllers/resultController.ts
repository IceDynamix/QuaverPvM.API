import { User, Map, Result } from "../models";
import { Request, Response } from "express";
import { ESRCH } from "node:constants";

export default class ResultController {
    public static allResults(req: Request, res: Response): void {
        Result.find()
            .populate("user")
            .populate("map")
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
        Result.findById(req.params.id)
            .populate("user")
            .populate("map")
            .exec()
            .then((result) => res.status(200).json(result))
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static getUserResults(req: Request, res: Response): void {
        Result.find({ user: req.params.id })
            .populate("user")
            .populate("map")
            .exec()
            .then((results) =>
                res.status(200).json({
                    count: results.length,
                    results,
                })
            )
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static getMapResults(req: Request, res: Response): void {
        Result.find({ map: req.params.id })
            .populate("user")
            .populate("map")
            .exec()
            .then((results) =>
                res.status(200).json({
                    count: results.length,
                    results,
                })
            )
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static createResult(req: Request, res: Response): void {
        const { user, map, result }: { user: number; map: number; result: boolean } = req.body;
        if (!user || !map) {
            res.status(500).json({ message: "Field user or map was not set" });
            return;
        }

        User.findById(user)
            .then((userDoc) => {
                if (!userDoc) res.status(500).json({ message: "Provided user does not exist" });
                else {
                    Map.findById(map)
                        .then((mapDoc) => {
                            if (!mapDoc) res.status(500).json({ message: "Provided map does not exist" });
                            else {
                                Result.create({ user, map, result })
                                    .then((result) => res.status(201).json(result))
                                    .catch((err) => res.status(500).json({ message: err.message, err }));
                            }
                        })
                        .catch((err) => res.status(500).json({ message: err.message, err }));
                }
            })
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }
}

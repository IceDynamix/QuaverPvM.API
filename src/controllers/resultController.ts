import { createIdFilter, EntityType, RatedEntity, Result } from "../models";
import { Request, Response } from "express";
import { mongoose } from "@typegoose/typegoose";

type ResultEntityBody = { entityType: EntityType; quaverId: number };

export default class ResultController {
    public static allResults(req: Request, res: Response): void {
        Result.find({})
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
        Result.findById(req.params.id)
            .populate("entity1")
            .populate("entity2")
            .exec()
            .then((result) => res.status(200).json(result))
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static getUserResults(req: Request, res: Response): void {
        RatedEntity.findOne(createIdFilter("user", req.params.id))
            .then((quaverUser) => {
                if (!quaverUser) res.status(500).json({ message: "Quaver user not found" });
                else {
                    Result.find({ $or: [{ entity1: quaverUser.id }, { entity2: quaverUser.id }] })
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
            })
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static getMapResults(req: Request, res: Response): void {
        RatedEntity.findOne(createIdFilter("map", req.params.id))
            .then((quaverMap) => {
                if (!quaverMap) res.status(500).json({ message: "Quaver map not found" });
                else {
                    Result.find({ $or: [{ entity1: quaverMap.id }, { entity2: quaverMap.id }] })
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
            })
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static createResult(req: Request, res: Response): void {
        const { entity1, entity2, result }: { entity1: ResultEntityBody; entity2: ResultEntityBody; result: boolean } = req.body;

        if (!entity1 || !entity1.entityType || !entity1.quaverId || !entity2 || !entity2.entityType || !entity2.quaverId) {
            res.status(500).json({ message: "An entity field was not set" });
            return;
        }

        RatedEntity.findOne({ entityType: entity1.entityType, quaverId: entity1.quaverId })
            .then((entity1Doc) => {
                if (!entity1Doc) res.status(500).json({ message: "Provided field entity1 does not exist" });
                else {
                    RatedEntity.findOne({ entityType: entity2.entityType, quaverId: entity2.quaverId })
                        .then((entity2Doc) => {
                            if (!entity2Doc) res.status(500).json({ message: "Provided field entity2 does not exist" });
                            else {
                                Result.create({ entity1: entity1Doc._id, entity2: entity2Doc._id, result })
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

import { Request, Response } from "express";
import { EntityModel } from "../models/entity";

export default class EntityController {
    public static all(req: Request, res: Response): void {
        EntityModel.find().then((results) => res.json({ count: results.length, results }));
    }

    public static getById(req: Request, res: Response): void {
        EntityModel.findById(req.params.id).then((result) => res.json(result));
    }

    public static allUsers(req: Request, res: Response): void {
        EntityModel.find({ entityType: "user" }).then((results) => res.json({ count: results.length, results }));
    }

    public static getUser(req: Request, res: Response): void {
        EntityModel.findUser(req.params.id).then((user) => res.json(user));
    }

    public static allMaps(req: Request, res: Response): void {
        EntityModel.find({ entityType: "map" }).then((results) => res.json({ count: results.length, results }));
    }

    public static getMap(req: Request, res: Response): void {
        EntityModel.findMap(req.params.id).then((map) => res.json(map));
    }

    public static createUser(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        EntityModel.createNewUser(quaverId)
            .then((user) => res.status(201).json(user))
            .catch((err) => {
                message: err.message, err;
            });
    }

    public static createMap(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        EntityModel.createNewMap(quaverId)
            .then((map) => res.status(201).json(map))
            .catch((err) => {
                message: err.message, err;
            });
    }
}

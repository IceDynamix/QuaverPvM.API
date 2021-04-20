import { Request, Response } from "express";
import { createIdFilter, EntityModel } from "../models/models";
import api from "../api/api";

export default class EntityController {
    public static allUsers(req: Request, res: Response): void {
        EntityController.find({ entityType: "user" }, req, res);
    }

    public static getUser(req: Request, res: Response): void {
        EntityController.findOne(createIdFilter("user", req.params.id), req, res);
    }

    public static allMaps(req: Request, res: Response): void {
        EntityController.find({ entityType: "map" }, req, res);
    }

    public static getMap(req: Request, res: Response): void {
        EntityController.findOne(createIdFilter("map", req.params.id), req, res);
    }

    public static createUser(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        EntityModel.findOne({ entityType: "user", quaverId })
            .exec()
            .then((result) => {
                if (result) res.status(500).json({ message: "User already exists" });
                else {
                    EntityController.FetchQuaverUser(req, quaverId, 1).then((quaverUser) => {
                        if (!quaverUser) {
                            res.status(500).json({ message: "Quaver user does not exist" });
                        } else {
                            EntityModel.create({ quaverId, entityType: "user", info: quaverUser.info }).then((user) =>
                                res.status(201).json(user)
                            );
                        }
                    });
                }
            })
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static createMap(req: Request, res: Response): void {
        let quaverId: number = parseInt(req.params.id);
        EntityModel.findOne({ entityType: "map", quaverId })
            .exec()
            .then((result) => {
                console.log(result);

                if (result) res.status(500).json({ message: "Map already exists" });
                else {
                    EntityController.FetchQuaverMap(req, quaverId).then((quaverMap) => {
                        if (!quaverMap) {
                            res.status(500).json({ message: "Quaver map does not exist" });
                        } else {
                            EntityModel.create({ quaverId, entityType: "map", info: quaverMap }).then((user) =>
                                res.status(201).json(user)
                            );
                        }
                    });
                }
            })
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    static find(filter: any, req: Request, res: Response): void {
        EntityModel.find(filter)
            .exec()
            .then((results) =>
                res.status(200).json({
                    count: results.length,
                    results,
                })
            )
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    static findOne(filter: any, req: Request, res: Response): void {
        EntityModel.findOne(filter)
            .exec()
            .then((result) => res.status(200).json(result))
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    static async FetchQuaverUser(req: Request, id: number | string, mode: number | string): Promise<any> {
        const response: any = await api.GET(req, `v1/users/full/${id}`);
        if (response.status != 200) return null;
        return response.user;
    }

    static async FetchQuaverMap(req: Request, id: number | string): Promise<any> {
        const response: any = await api.GET(req, `v1/maps/${id}`);
        if (response.status != 200) return null;
        return response.map;
    }
}

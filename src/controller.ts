import { Request, Response } from "express";
import { User, Map } from "./models";
import api from "./api";
import { Mongoose, Model } from "mongoose";

export default class RankedEntityController {
    public static allUsers(req: Request, res: Response): void {
        RankedEntityController.all(User, req, res);
    }

    public static getUser(req: Request, res: Response): void {
        RankedEntityController.find(User, req, res);
    }

    public static allMaps(req: Request, res: Response): void {
        RankedEntityController.all(Map, req, res);
    }

    public static getMap(req: Request, res: Response): void {
        RankedEntityController.find(Map, req, res);
    }

    public static createUser(req: Request, res: Response): void {
        let id: number = parseInt(req.params.id);
        User.findById(id)
            .exec()
            .then((result) => {
                console.log(result);

                if (result) res.status(500).json({ message: "User already exists" });
                else {
                    RankedEntityController.FetchQuaverUser(req, id, 1).then((quaverUser) => {
                        if (!quaverUser) {
                            res.status(500).json({ message: "Quaver user does not exist" });
                        } else {
                            User.create({ _id: id, info: quaverUser.info }).then((user) => res.status(201).json(user));
                        }
                    });
                }
            })
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static createMap(req: Request, res: Response): void {
        let id: number = parseInt(req.params.id);
        Map.findById(id)
            .exec()
            .then((result) => {
                if (result) res.status(500).json({ message: "Map already exists" });
                else {
                    RankedEntityController.FetchQuaverMap(req, id).then((quaverMap) => {
                        if (!quaverMap) {
                            res.status(500).json({ message: "Quaver map does not exist" });
                        } else {
                            Map.create({ _id: id, info: quaverMap }).then((map) => res.status(201).json(map));
                        }
                    });
                }
            })
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    static all(model: Model<any, {}>, req: Request, res: Response) {
        model
            .find()
            .exec()
            .then((results) =>
                res.status(200).json({
                    count: results.length,
                    results,
                })
            )
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    static find(model: Model<any, {}>, req: Request, res: Response) {
        model
            .findById(req.params.id)
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

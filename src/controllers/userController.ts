import { Request, Response } from "express";
import User from "../models/user";
import api from "../api/api";

export default class UserController {
    public static allUsers(req: Request, res: Response): void {
        User.find()
            .exec()
            .then((results) =>
                res.status(200).json({
                    count: results.length,
                    users: results,
                })
            )
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static getUser(req: Request, res: Response): void {
        User.findById(req.params.id)
            .exec()
            .then((result) => res.status(200).json(result))
            .catch((err) => res.status(500).json({ message: err.message, err }));
    }

    public static addUser(req: Request, res: Response): void {
        let id: number = parseInt(req.params.id);

        User.findById(id)
            .exec()
            .then((result) => {
                console.log(result);

                if (result) res.status(500).json({ message: "User already exists" });
                else {
                    UserController.FetchQuaverUser(req, id, 1).then((quaverUser) => {
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

    static async FetchQuaverUser(req: Request, id: any, mode: any): Promise<any> {
        const response: any = await api.GET(req, `v1/users/full/${id}`);
        if (response.status != 200) return null;
        return response.user;
    }
}

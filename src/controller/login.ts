import { Request, Response } from "express";
import config from "../config/config";
import { EntityModel } from "../models/entity";
import Requester from "../requester/requester";

export default class LoginController {
    public static login(req: Request, res: Response) {
        if (!req.user) {
            return res.redirect(`${config.quaverBaseUrl}/oauth2/authorize?redirect_url=${config.selfUrl}/verify`);
        } else {
            return res.redirect("/");
        }
    }

    public static logout(req: Request, res: Response) {
        req.logout();
        res.redirect("/");
    }

    public static async verify(req: Request, res: Response) {
        try {
            const token = req.query.token;
            if (!token) res.status(401).json({ message: "No token sent? You shouldn't be here" });

            let response: any = await Requester.POST(`${config.quaverBaseUrl}/oauth2/verify`, { token });

            // Save and update session
            const quaverUser = response.data.user;
            let pvmUser: any = await EntityModel.findOne({ entityType: "user", quaverId: quaverUser.id }).exec();
            if (!pvmUser) await EntityModel.createNewUser(quaverUser.id);

            req.login(pvmUser, function() {});
            res.end();
            return res.redirect("/");
        } catch (err) {
            res.status(500).json({ message: err.message, err });
        }
    }
}

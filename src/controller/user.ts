import { Request, Response } from "express";
import { prisma } from "../../server";

export default class UserController {
    public static async GET(req: Request, res: Response, next: Function) {
        const { id } = req.query;
        if (!id) {
            res.json(null);
            return;
        }

        const userId = parseInt(id.toString());
        let result = await prisma.user.findUnique({ where: { userId } });
        res.json(result);
    }

    public static async selfGET(req: Request, res: Response, next: Function) {
        res.json(req.user);
    }
}

import { Router } from "express";
import EntityController from "../controller/entity";
import ResultController from "../controller/result";

const router: Router = Router();

router.get("/", (req, res) => res.json({ message: "Welcome to the QuaverPvM API!" }));
router.get("/entity", EntityController.GET);
router.get("/result", ResultController.GET);

export default router;

import { Router } from "express";
import DatapointController from "../controller/datapoint";
import EntityController from "../controller/entity";
import ResultController from "../controller/result";

const router: Router = Router();

router.get("/", (req, res) => res.json({ message: "Welcome to the QuaverPvM API!" }));
router.get("/entities", EntityController.GET);
router.get("/results", ResultController.GET);
router.get("/datapoints", DatapointController.GET);

export default router;

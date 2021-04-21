import { Router } from "express";
import EntityController from "../controller/entity";
import ResultController from "../controller/result";

const router: Router = Router();

router.get("/", (req, res) => res.json({ message: "Welcome to the QuaverPvM API!" }));

router.get("/entity", EntityController.all);
router.get("/entity/:id", EntityController.getById);
router.get("/entity/users", EntityController.allUsers);
router.get("/entity/users/:id", EntityController.getUser);
router.get("/entity/maps", EntityController.allMaps);
router.get("/entity/maps/:id", EntityController.getMap);

router.get("/maps", EntityController.allMaps);
router.get("/maps/:id", EntityController.getMap);
router.post("/maps/:id", EntityController.createMap);

router.get("/results", ResultController.allResults);
router.get("/results/:id", ResultController.getResult);
router.get("/results/entity/:id", ResultController.getEntityResults);
router.post("/results/", ResultController.createResult);

export default router;

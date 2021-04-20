import { Router } from "express";
import EntityController from "../controllers/entityController";
import ResultController from "../controllers/resultController";

const router: Router = Router();

router.get("/users", EntityController.allUsers);
router.get("/users/:id", EntityController.getUser);
router.post("/users/:id", EntityController.createUser);

router.get("/maps", EntityController.allMaps);
router.get("/maps/:id", EntityController.getMap);
router.post("/maps/:id", EntityController.createMap);

router.get("/results", ResultController.allResults);
router.get("/results/:id", ResultController.getResult);
router.get("/results/user/:id", ResultController.getUserResults);
router.get("/results/map/:id", ResultController.getMapResults);
router.post("/results/", ResultController.createResult);

export default router;

import Database from "./config/database";
import { Entity } from "./models/entity";

Database.connect();
Entity.addNewMaps(50);

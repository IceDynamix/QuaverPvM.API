import Database from "./config/database";
import {Entity} from "./models/entity";

Database.connect();
Entity.addNewMaps().then(r => console.log("Added all maps"));

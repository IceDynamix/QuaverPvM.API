import Database from "./config/database";
import Glicko from "./glicko/glicko";

Database.connect();
Glicko.updateAll();

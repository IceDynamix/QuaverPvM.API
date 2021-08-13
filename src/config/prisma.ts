import { PrismaClient, User as PrismaUser } from "@prisma/client";

declare global {
    namespace Express {
        interface User extends PrismaUser {}
    }
}

export default new PrismaClient({
    log: ["info", `warn`, `error`],
    errorFormat: "pretty",
});

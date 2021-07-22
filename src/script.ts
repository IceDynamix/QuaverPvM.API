import { PrismaClient } from "@prisma/client";
import quaverApi from "./quaverApi";

const prisma = new PrismaClient();

async function main() {
    // const results = await prisma.map.findMany({ where: { rating: { gt: 1000, lt: 1500 } } });
    // console.dir(results, { depth: null });
    let map = await quaverApi.getQuaverUser(46439);
    console.dir(map, { depth: null });
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

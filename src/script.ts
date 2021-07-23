import { PrismaClient } from "@prisma/client";
import quaverApi from "./quaverApi";
import redis from "redis";
import { promisify } from "util";

const prisma = new PrismaClient();
const redisClient = redis.createClient();
const redisGetAsync = promisify(redisClient.get).bind(redisClient);
const redisSetExAsync = promisify(redisClient.setex).bind(redisClient);

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

export { prisma, redisClient, redisGetAsync, redisSetExAsync };

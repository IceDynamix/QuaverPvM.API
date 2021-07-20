import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
    const results = await prisma.map.findMany({ where: { rating: { gt: 1000, lt: 1500 } } });
    console.dir(results, { depth: null });
}

main()
    .catch((e) => {
        throw e;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });

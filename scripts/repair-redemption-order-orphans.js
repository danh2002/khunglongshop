const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  await prisma.$executeRawUnsafe(
    "ALTER TABLE `RedemptionCode` MODIFY `orderId` VARCHAR(191) NULL"
  );
  const repaired = await prisma.$executeRawUnsafe(`
    UPDATE RedemptionCode rc
    LEFT JOIN Customer_order o ON o.id = rc.orderId
    SET rc.orderId = NULL
    WHERE rc.orderId IS NOT NULL AND o.id IS NULL
  `);
  console.log({ repairedOrderReferences: repaired });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

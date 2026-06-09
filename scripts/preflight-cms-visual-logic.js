const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const [productOrphans, orderOrphans, userOrphans, anomalies, orderStatuses, merchantStatuses] =
    await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT rc.id, rc.productId
        FROM RedemptionCode rc
        LEFT JOIN Product p ON p.id = rc.productId
        WHERE p.id IS NULL
      `),
      prisma.$queryRawUnsafe(`
        SELECT rc.id, rc.orderId
        FROM RedemptionCode rc
        LEFT JOIN Customer_order o ON o.id = rc.orderId
        WHERE rc.orderId IS NOT NULL AND o.id IS NULL
      `),
      prisma.$queryRawUnsafe(`
        SELECT rc.id, rc.userId
        FROM RedemptionCode rc
        LEFT JOIN User u ON u.id = rc.userId
        WHERE rc.userId IS NOT NULL AND u.id IS NULL
      `),
      prisma.$queryRawUnsafe(`
        SELECT id, code
        FROM RedemptionCode
        WHERE isUsed = true AND usedAt IS NULL
      `),
      prisma.$queryRawUnsafe(`
        SELECT status, COUNT(*) AS count
        FROM Customer_order
        GROUP BY status
      `),
      prisma.$queryRawUnsafe(`
        SELECT status, COUNT(*) AS count
        FROM Merchant
        GROUP BY status
      `),
    ]);

  console.log("CMS migration preflight");
  console.table({ productOrphans: productOrphans.length, orderOrphans: orderOrphans.length, userOrphans: userOrphans.length });
  console.log("Order statuses:", orderStatuses);
  console.log("Merchant statuses:", merchantStatuses);

  for (const anomaly of anomalies) {
    console.warn(
      `[WARN] RedemptionCode ${anomaly.id} (${anomaly.code}) has isUsed=true and usedAt=NULL; it will remain ACTIVE.`
    );
  }

  if (productOrphans.length > 0 || orderOrphans.length > 0 || userOrphans.length > 0) {
    console.error("Resolve orphan references before applying the expand migration.");
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

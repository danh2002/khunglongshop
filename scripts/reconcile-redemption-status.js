const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.redemptionCode.updateMany({
    where: {
      isUsed: true,
      usedAt: { not: null },
      status: "ACTIVE",
    },
    data: { status: "REDEEMED" },
  });
  const inconsistent = await prisma.redemptionCode.count({
    where: {
      isUsed: true,
      usedAt: { not: null },
      status: "ACTIVE",
    },
  });
  console.log({ reconciledRows: updated.count, inconsistentRows: inconsistent });
  if (inconsistent !== 0) {
    throw new Error("Reader migration blocked: inconsistent redemption rows remain.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SET_SLUG = "ricon";
const POOL_ID = "ricon-pool-v1";

async function main() {
  const collectorSet = await prisma.collectorSet.findFirst({
    where: {
      OR: [{ slug: SET_SLUG }, { name: "Ricon" }],
    },
    include: {
      products: {
        where: { isCollector: true, setSlotNumber: { not: null } },
        orderBy: { setSlotNumber: "asc" },
        select: { id: true, title: true, setSlotNumber: true },
      },
    },
  });

  if (!collectorSet) throw new Error("RICON_SET_NOT_FOUND");

  const products = collectorSet.products;
  const slots = new Set(products.map((product) => product.setSlotNumber));
  if (products.length !== collectorSet.totalSlots || slots.size !== collectorSet.totalSlots) {
    throw new Error(
      `RICON_PRODUCTS_INCOMPLETE: expected ${collectorSet.totalSlots} slotted products, found ${products.length}`
    );
  }

  for (let slot = 1; slot <= collectorSet.totalSlots; slot += 1) {
    if (!slots.has(slot)) throw new Error(`RICON_SLOT_MISSING: ${slot}`);
  }

  await prisma.$transaction(async (tx) => {
    await tx.blindBoxPoolVersion.updateMany({
      where: {
        collectorSetId: collectorSet.id,
        status: "ACTIVE",
        id: { not: POOL_ID },
      },
      data: { status: "ARCHIVED", activeSetKey: null },
    });

    const poolVersion = await tx.blindBoxPoolVersion.upsert({
      where: { id: POOL_ID },
      update: {
        status: "ACTIVE",
        activeSetKey: collectorSet.id,
        publishedAt: new Date(),
      },
      create: {
        id: POOL_ID,
        collectorSetId: collectorSet.id,
        version: 1,
        status: "ACTIVE",
        activeSetKey: collectorSet.id,
        publishedAt: new Date(),
      },
    });

    await tx.blindBoxPoolEntry.deleteMany({
      where: { poolVersionId: poolVersion.id },
    });
    await tx.blindBoxPoolEntry.createMany({
      data: products.map((product) => ({
        poolVersionId: poolVersion.id,
        productId: product.id,
        slotNumber: product.setSlotNumber,
        drawWeight: product.setSlotNumber === collectorSet.totalSlots ? 10 : 100,
        rarityTier: product.setSlotNumber === collectorSet.totalSlots ? "LEGENDARY" : "COMMON",
      })),
    });
  });

  console.log(`Seeded ACTIVE Ricon pool ${POOL_ID} with ${products.length} entries.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

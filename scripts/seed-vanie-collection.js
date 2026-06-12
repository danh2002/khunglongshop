const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const SET_ID = "vanie-collection";
const TEST_EMAIL = "danhphamhuy698@gmail.com";

async function main() {
  const category = await prisma.category.upsert({
    where: { name: "Vanie" },
    update: {},
    create: { name: "Vanie" },
  });

  let merchant = await prisma.merchant.findFirst({
    where: { name: "Khung Long Shop Merch" },
  });

  if (!merchant) {
    merchant = await prisma.merchant.create({
      data: {
        name: "Khung Long Shop Merch",
        description: "Gian hàng vật phẩm chính thức của Đảo Khủng Long",
        status: "ACTIVE",
      },
    });
  }

  const collectorSet = await prisma.collectorSet.upsert({
    where: { id: SET_ID },
    update: {
      name: "Vanie",
      description: "Bộ sưu tập 10 nhân vật Vanie",
      totalSlots: 10,
      rewardDescription: "Hoàn thành bộ sưu tập Vanie",
      rewardCodeTemplate: "VANIE-COMPLETE",
    },
    create: {
      id: SET_ID,
      name: "Vanie",
      description: "Bộ sưu tập 10 nhân vật Vanie",
      totalSlots: 10,
      rewardDescription: "Hoàn thành bộ sưu tập Vanie",
      rewardCodeTemplate: "VANIE-COMPLETE",
    },
  });

  const productIds = [];

  for (let slot = 1; slot <= 10; slot += 1) {
    const slug = `vanie-${slot}`;
    const product = await prisma.product.upsert({
      where: { slug },
      update: {
        title: `Vanie ${slot}`,
        mainImage: `images/mk${slot}.png`,
        description: `Nhân vật Vanie ${slot} thuộc bộ sưu tập Vanie.`,
        manufacturer: "Khung Long Shop",
        categoryId: category.id,
        merchantId: merchant.id,
        setId: collectorSet.id,
        setSlotNumber: slot,
        isCollector: true,
        isBlindBox: false,
        isVisible: false,
        price: 0,
      },
      create: {
        id: slug,
        slug,
        title: `Vanie ${slot}`,
        mainImage: `images/mk${slot}.png`,
        price: 0,
        rating: 5,
        description: `Nhân vật Vanie ${slot} thuộc bộ sưu tập Vanie.`,
        manufacturer: "Khung Long Shop",
        inStock: 10,
        categoryId: category.id,
        merchantId: merchant.id,
        setId: collectorSet.id,
        setSlotNumber: slot,
        isCollector: true,
        isBlindBox: false,
        isVisible: false,
      },
    });

    productIds.push(product.id);
  }

  const blindBox = await prisma.product.upsert({
    where: { slug: "vanie-blind-box" },
    update: {
      title: "Túi mù Vanie",
      mainImage: "/images/blind-box/vanie-blind-box-cover.png",
      price: 150000,
      description: "Mỗi hộp chứa ngẫu nhiên 1 trong 10 mẫu Vanie. Vanie 10 là mẫu hiếm nhất.",
      manufacturer: "Khung Long Shop",
      inStock: 100,
      categoryId: category.id,
      merchantId: merchant.id,
      isCollector: false,
      setId: null,
      setSlotNumber: null,
      isBlindBox: true,
      isVisible: true,
      blindBoxSetId: collectorSet.id,
    },
    create: {
      id: "vanie-blind-box",
      slug: "vanie-blind-box",
      title: "Túi mù Vanie",
      mainImage: "/images/blind-box/vanie-blind-box-cover.png",
      price: 150000,
      rating: 5,
      description: "Mỗi hộp chứa ngẫu nhiên 1 trong 10 mẫu Vanie. Vanie 10 là mẫu hiếm nhất.",
      manufacturer: "Khung Long Shop",
      inStock: 100,
      categoryId: category.id,
      merchantId: merchant.id,
      isCollector: false,
      isBlindBox: true,
      isVisible: true,
      blindBoxSetId: collectorSet.id,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.blindBoxPoolVersion.updateMany({
      where: {
        collectorSetId: collectorSet.id,
        status: "ACTIVE",
        id: { not: "vanie-pool-v1" },
      },
      data: { status: "ARCHIVED", activeSetKey: null },
    });

    const poolVersion = await tx.blindBoxPoolVersion.upsert({
      where: { id: "vanie-pool-v1" },
      update: {
        status: "ACTIVE",
        activeSetKey: collectorSet.id,
        publishedAt: new Date(),
      },
      create: {
        id: "vanie-pool-v1",
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
      data: productIds.map((productId, index) => ({
        poolVersionId: poolVersion.id,
        productId,
        slotNumber: index + 1,
        drawWeight: index === 9 ? 10 : 100,
        rarityTier: index === 9 ? "LEGENDARY" : "COMMON",
      })),
    });
  });

  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: { id: true },
  });

  if (user) {
    await prisma.redemptionCode.deleteMany({
      where: {
        userId: user.id,
        productId: { in: productIds },
        code: { startsWith: "VANIE-" },
        allocationId: null,
      },
    });
    await prisma.setReward.deleteMany({
      where: {
        userId: user.id,
        setId: collectorSet.id,
      },
    });

    for (let slot = 1; slot <= 10; slot += 1) {
      const code = `VANIE-${String(slot).padStart(2, "0")}`;

      await prisma.redemptionCode.upsert({
        where: { code },
        update: {
          productId: productIds[slot - 1],
          orderId: null,
          allocationId: null,
          userId: user.id,
          isUsed: false,
          status: "ACTIVE",
          usedAt: null,
        },
        create: {
          code,
          productId: productIds[slot - 1],
          orderId: null,
          userId: user.id,
        },
      });
    }
  }

  console.log(
    `Seeded ${collectorSet.name}, ${productIds.length} variants, blind-box SKU ${blindBox.slug}, pool weight 910, and test codes.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

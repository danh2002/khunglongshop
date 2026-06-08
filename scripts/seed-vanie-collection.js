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
      },
    });

    productIds.push(product.id);
  }

  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    select: { id: true },
  });

  if (user) {
    await prisma.redemptionCode.deleteMany({
      where: {
        userId: user.id,
        productId: { in: productIds },
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
          orderId: "vanie-test-seed",
          userId: user.id,
          isUsed: false,
          usedAt: null,
        },
        create: {
          code,
          productId: productIds[slot - 1],
          orderId: "vanie-test-seed",
          userId: user.id,
        },
      });
    }
  }

  console.log(`Seeded ${collectorSet.name} with ${productIds.length} locked products and test codes.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

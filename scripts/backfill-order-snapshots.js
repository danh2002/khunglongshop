const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const orders = await prisma.customer_order.findMany({
    where: {
      products: {
        some: {
          OR: [
            { productTitle: null },
            { productSlug: null },
            { unitPrice: null },
            { snapshotSource: null },
          ],
        },
      },
    },
    include: {
      products: {
        include: {
          product: {
            select: { title: true, slug: true, price: true },
          },
        },
      },
    },
  });

  let derived = 0;
  let estimated = 0;

  for (const order of orders) {
    for (const item of order.products) {
      const canDerive =
        order.products.length === 1 &&
        item.quantity > 0 &&
        order.total >= 0 &&
        order.total % item.quantity === 0;
      const unitPrice = canDerive ? order.total / item.quantity : item.product.price;
      const snapshotSource = canDerive ? "BACKFILL_DERIVED" : "BACKFILL_ESTIMATE";

      await prisma.customer_order_product.update({
        where: { id: item.id },
        data: {
          productTitle: item.productTitle ?? item.product.title,
          productSlug: item.productSlug ?? item.product.slug,
          unitPrice: item.unitPrice ?? unitPrice,
          snapshotSource: item.snapshotSource ?? snapshotSource,
        },
      });

      if (canDerive) derived += 1;
      else estimated += 1;
    }
  }

  const nullRows = await prisma.customer_order_product.count({
    where: {
      OR: [
        { productTitle: null },
        { productSlug: null },
        { unitPrice: null },
        { snapshotSource: null },
      ],
    },
  });
  console.log({ derived, estimated, nullRows });
  if (nullRows !== 0) {
    throw new Error(`Snapshot contract blocked: ${nullRows} rows still contain NULL fields.`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

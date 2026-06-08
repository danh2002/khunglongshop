const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const categories = [
  "moc khoa",
  "ao thun",
  "hoodie",
  "mu non",
  "sticker",
  "balo tui",
  "ly coc",
  "poster",
  "figure",
  "collector box",
];

const products = [
  {
    title: "Moc Khoa Dino Candy Pink",
    slug: "moc-khoa-dino-candy-pink",
    price: 12,
    rating: 5,
    description: "Moc khoa acrylic khung long hong, hoa tiet trai tim va keo ngot de thuong.",
    mainImage: "images/mk1.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 32,
    isCollector: true,
  },
  {
    title: "Moc Khoa Lava Black",
    slug: "moc-khoa-lava-black",
    price: 14,
    rating: 5,
    description: "Moc khoa khung long den do voi hoa tiet lua, phong cach manh me.",
    mainImage: "images/mk2.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 18,
    isCollector: true,
  },
  {
    title: "Moc Khoa Sky Blue",
    slug: "moc-khoa-sky-blue",
    price: 13,
    rating: 5,
    description: "Moc khoa khung long xanh troi voi may va ngoi sao sang.",
    mainImage: "images/mk3.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 14,
    isCollector: false,
  },
  {
    title: "Moc Khoa Tiger Star",
    slug: "moc-khoa-tiger-star",
    price: 13,
    rating: 4,
    description: "Moc khoa khung long vang cam voi soc ho va hoa tiet ngoi sao.",
    mainImage: "images/mk4.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 25,
    isCollector: false,
  },
  {
    title: "Moc Khoa Jungle Ricon",
    slug: "moc-khoa-jungle-ricon",
    price: 15,
    rating: 5,
    description: "Moc khoa khung long xanh la voi hoa tiet la cay va logo Ricon.",
    mainImage: "images/mk5.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 45,
    isCollector: false,
  },
  {
    title: "Moc Khoa Mint Garden",
    slug: "moc-khoa-mint-garden",
    price: 12,
    rating: 4,
    description: "Moc khoa khung long xanh mint voi hoa la nhe nhang.",
    mainImage: "images/mk6.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 12,
    isCollector: false,
  },
  {
    title: "Moc Khoa Moon Purple",
    slug: "moc-khoa-moon-purple",
    price: 14,
    rating: 5,
    description: "Moc khoa khung long tim voi trang khuyet va hoa tiet anh sao.",
    mainImage: "images/mk7.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 22,
    isCollector: false,
  },
  {
    title: "Moc Khoa Ice Ricon",
    slug: "moc-khoa-ice-ricon",
    price: 15,
    rating: 5,
    description: "Moc khoa khung long bang tuyet voi logo Ricon va bong tuyet.",
    mainImage: "images/mk8.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 30,
    isCollector: false,
  },
  {
    title: "Moc Khoa Dragon Violet",
    slug: "moc-khoa-dragon-violet",
    price: 16,
    rating: 5,
    description: "Moc khoa khung long tim dam voi hoa tiet rong vang, phien ban dac biet.",
    mainImage: "images/mk9.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 5,
    isCollector: true,
  },
  {
    title: "Moc Khoa Royal Black",
    slug: "moc-khoa-royal-black",
    price: 17,
    rating: 5,
    description: "Moc khoa khung long den vang voi vuong mien, mau collector sang trong.",
    mainImage: "images/mk10.png",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 4,
    isCollector: true,
  },
];

async function ensureMerchant() {
  const existing = await prisma.merchant.findFirst({ orderBy: { id: "asc" } });

  if (existing) {
    return existing.id;
  }

  const merchant = await prisma.merchant.create({
    data: {
      name: "Dao Khung Long Merch",
      description: "Official dinosaur merch store",
      phone: "+381 61 123 321",
      address: "Amber Island",
      status: "active",
    },
  });

  return merchant.id;
}

async function ensureCategories() {
  const categoryByName = new Map();

  for (const name of categories) {
    const category = await prisma.category.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    categoryByName.set(name, category);
  }

  return categoryByName;
}

async function updateExistingProducts(categoryByName, merchantId) {
  const existingProducts = await prisma.product.findMany({
    orderBy: { id: "asc" },
  });

  if (existingProducts.length === 0) {
    for (const product of products) {
      const category = categoryByName.get(product.category);
      await prisma.product.create({
        data: {
          id: product.slug,
          title: product.title,
          slug: product.slug,
          price: product.price,
          rating: product.rating,
          description: product.description,
          mainImage: product.mainImage,
          manufacturer: product.manufacturer,
          inStock: product.inStock,
          isCollector: product.isCollector,
          categoryId: category.id,
          merchantId,
        },
      });
    }
    return products.length;
  }

  let updated = 0;
  for (let index = 0; index < existingProducts.length; index += 1) {
    const template = products[index % products.length];
    const suffix = index >= products.length ? `-${index + 1}` : "";
    const category = categoryByName.get(template.category);

    await prisma.product.update({
      where: { id: existingProducts[index].id },
      data: {
        title: index >= products.length ? `${template.title} ${index + 1}` : template.title,
        slug: `${template.slug}${suffix}`,
        price: template.price,
        rating: template.rating,
        description: template.description,
        mainImage: template.mainImage,
        manufacturer: template.manufacturer,
        inStock: template.inStock,
        isCollector: template.isCollector,
        categoryId: category.id,
      },
    });
    updated += 1;
  }

  return updated;
}

async function main() {
  const merchantId = await ensureMerchant();
  const categoryByName = await ensureCategories();
  const productCount = await updateExistingProducts(categoryByName, merchantId);

  console.log(`Merch categories ready: ${categoryByName.size}`);
  console.log(`Merch products converted: ${productCount}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

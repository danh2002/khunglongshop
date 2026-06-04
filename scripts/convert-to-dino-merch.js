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
    title: "Moc Khoa Raptor Limited",
    slug: "moc-khoa-raptor-limited",
    price: 12,
    rating: 5,
    description: "Moc khoa kim loai hinh Raptor, phien ban collector set cua Dao Khung Long.",
    mainImage: "merch/product-keychain.svg",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 32,
    isCollector: true,
  },
  {
    title: "Ao Thun Volcano T-Rex",
    slug: "ao-thun-volcano-trex",
    price: 29,
    rating: 5,
    description: "Ao thun cotton den, in T-Rex va nui lua cam theo style merch chinh hang.",
    mainImage: "merch/product-shirt.svg",
    manufacturer: "Dao Khung Long",
    category: "ao thun",
    inStock: 18,
    isCollector: true,
  },
  {
    title: "Hoodie Amber Island",
    slug: "hoodie-amber-island",
    price: 59,
    rating: 5,
    description: "Hoodie day dan, tone den cam, thiet ke Amber Island cho fan sinh ton.",
    mainImage: "merch/product-hoodie.svg",
    manufacturer: "Dao Khung Long",
    category: "hoodie",
    inStock: 14,
    isCollector: false,
  },
  {
    title: "Mu Non Dino Crew",
    slug: "mu-non-dino-crew",
    price: 24,
    rating: 4,
    description: "Mu non den voi logo Dino Crew theu cam, de doi hang ngay.",
    mainImage: "merch/product-cap.svg",
    manufacturer: "Dao Khung Long",
    category: "mu non",
    inStock: 25,
    isCollector: false,
  },
  {
    title: "Sticker Pack Lava Run",
    slug: "sticker-pack-lava-run",
    price: 9,
    rating: 5,
    description: "Bo sticker chong nuoc gom T-Rex, dau chan khung long va dung nham.",
    mainImage: "merch/product-sticker.svg",
    manufacturer: "Dao Khung Long",
    category: "sticker",
    inStock: 45,
    isCollector: false,
  },
  {
    title: "Balo Explorer Fossil",
    slug: "balo-explorer-fossil",
    price: 49,
    rating: 4,
    description: "Balo merch dung laptop, phu kien va collector gear cho chuyen di san.",
    mainImage: "merch/product-bag.svg",
    manufacturer: "Dao Khung Long",
    category: "balo tui",
    inStock: 12,
    isCollector: false,
  },
  {
    title: "Ly Su Jurassic Flame",
    slug: "ly-su-jurassic-flame",
    price: 18,
    rating: 5,
    description: "Ly su den nham, logo Jurassic Flame doi mau cam khi uong nong.",
    mainImage: "merch/product-mug.svg",
    manufacturer: "Dao Khung Long",
    category: "ly coc",
    inStock: 22,
    isCollector: false,
  },
  {
    title: "Poster T-Rex Volcano",
    slug: "poster-trex-volcano",
    price: 15,
    rating: 5,
    description: "Poster cinematic T-Rex va nui lua, in giay day cho goc setup.",
    mainImage: "merch/product-poster.svg",
    manufacturer: "Dao Khung Long",
    category: "poster",
    inStock: 30,
    isCollector: false,
  },
  {
    title: "Figure Baby Raptor",
    slug: "figure-baby-raptor",
    price: 39,
    rating: 5,
    description: "Figure Baby Raptor de ban, mau doc quyen cua dot merch dau tien.",
    mainImage: "merch/product-figure.svg",
    manufacturer: "Dao Khung Long",
    category: "figure",
    inStock: 5,
    isCollector: true,
  },
  {
    title: "Collector Box Amber Island",
    slug: "collector-box-amber-island",
    price: 79,
    rating: 5,
    description: "Hop collector gom pin, sticker, moc khoa va ma phan thuong trong game.",
    mainImage: "merch/product-box.svg",
    manufacturer: "Dao Khung Long",
    category: "collector box",
    inStock: 4,
    isCollector: true,
  },
  {
    title: "Pin Enamel Dino Skull",
    slug: "pin-enamel-dino-skull",
    price: 11,
    rating: 4,
    description: "Pin enamel dau khung long, phu kien nho cho balo va ao khoac.",
    mainImage: "merch/product-keychain.svg",
    manufacturer: "Dao Khung Long",
    category: "moc khoa",
    inStock: 28,
    isCollector: false,
  },
  {
    title: "Ao Khoac Windbreaker Lava",
    slug: "ao-khoac-windbreaker-lava",
    price: 69,
    rating: 5,
    description: "Ao khoac gio chong nuoc nhe, hoa tiet lava orange tren nen den.",
    mainImage: "merch/product-hoodie.svg",
    manufacturer: "Dao Khung Long",
    category: "hoodie",
    inStock: 8,
    isCollector: false,
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

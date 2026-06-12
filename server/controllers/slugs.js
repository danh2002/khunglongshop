const prisma = require("../utills/db"); // ✅ Use shared connection

async function getProductBySlug(request, response) {
  const { slug } = request.params;
  if (/^vanie-(?:[1-9]|10)$/.test(slug)) {
    return response.redirect(308, "/product/vanie-blind-box");
  }

  const foundProduct = await prisma.product.findFirst({
    where: {
      slug,
      isVisible: true,
      isBlindBox: true,
      isCollector: false,
    },
    include: {
      category: true,
      set: true
    },
  });

  if (!foundProduct) {
    return response.status(404).json({ error: "Product not found" });
  }
  return response.status(200).json(foundProduct);
}

module.exports = { getProductBySlug };

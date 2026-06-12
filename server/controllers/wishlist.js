const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");

const productSelect = {
  id: true,
  title: true,
  price: true,
  mainImage: true,
  slug: true,
  inStock: true,
};

const assertRequestedUser = (request) => {
  const requestedUserId =
    request.params.userId ||
    request.body?.userId ||
    request.query?.userId ||
    request.get("userId") ||
    request.get("x-user-id");
  if (requestedUserId && requestedUserId !== request.user.id) {
    throw new AppError("FORBIDDEN", 403);
  }
};

const getAllWishlist = asyncHandler(async (request, response) => {
  assertRequestedUser(request);
  const wishlist = await prisma.$transaction(async (tx) => {
    await tx.wishlist.deleteMany({
      where: { userId: request.user.id, product: { isVisible: false } },
    });
    return tx.wishlist.findMany({
      where: { userId: request.user.id },
      include: { product: { select: productSelect } },
    });
  });
  return response.json({ wishlist });
});

const getAllWishlistByUserId = asyncHandler(async (request, response) => {
  assertRequestedUser(request);
  const wishlist = await prisma.wishlist.findMany({
    where: { userId: request.user.id },
    include: { product: { select: productSelect } },
  });

  return response.json({ wishlist });
});

const getSingleProductFromWishlist = asyncHandler(
  async (request, response) => {
    assertRequestedUser(request);
    const { productId } = request.params;
    const item = await prisma.wishlist.findFirst({
      where: { userId: request.user.id, productId },
      include: { product: { select: productSelect } },
    });

    return response.json({ item });
  }
);

const createWishItem = asyncHandler(async (request, response) => {
  assertRequestedUser(request);
  const { productId } = request.body;

  if (!productId) {
    throw new AppError("productId is required", 400);
  }
  const userId = request.user.id;
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (
    !product ||
    !product.isVisible ||
    !product.isBlindBox ||
    product.isCollector ||
    product.slug !== "vanie-blind-box"
  ) {
    throw new AppError("PRODUCT_NOT_AVAILABLE", 422);
  }

  const existing = await prisma.wishlist.findFirst({
    where: { userId, productId },
    include: { product: { select: productSelect } },
  });

  if (existing) {
    return response.json({ item: existing, created: false });
  }

  const item = await prisma.wishlist.create({
    data: { userId, productId },
    include: { product: { select: productSelect } },
  });

  return response.status(201).json({ item, created: true });
});

const deleteWishItem = asyncHandler(async (request, response) => {
  assertRequestedUser(request);
  const { productId } = request.params;
  const result = await prisma.wishlist.deleteMany({
    where: { userId: request.user.id, productId },
  });

  return response.json({ deletedCount: result.count });
});

module.exports = {
  getAllWishlistByUserId,
  getAllWishlist,
  createWishItem,
  deleteWishItem,
  getSingleProductFromWishlist,
};

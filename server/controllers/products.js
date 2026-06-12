const prisma = require("../utills/db"); // ✅ Use shared connection with SSL
const { asyncHandler, handleServerError, AppError } = require("../utills/errorHandler");

// Security: Define whitelists for allowed filter types and operators
const ALLOWED_FILTER_TYPES = ['price', 'rating', 'category', 'inStock', 'outOfStock'];
const ALLOWED_OPERATORS = ['gte', 'lte', 'gt', 'lt', 'equals', 'contains'];
const ALLOWED_SORT_VALUES = ['defaultSort', 'titleAsc', 'titleDesc', 'lowPrice', 'highPrice', 'newestSort'];

function serializeProductImages(images) {
  return JSON.stringify(Array.isArray(images) ? images.slice(0, 8) : []);
}

function parseProductImages(images) {
  if (!images) return [];

  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) && parsed.every((image) => typeof image === "string")
      ? parsed
      : [];
  } catch {
    return [];
  }
}

// Security: Input validation functions
function validateFilterType(filterType) {
  return ALLOWED_FILTER_TYPES.includes(filterType);
}

function validateOperator(operator) {
  return ALLOWED_OPERATORS.includes(operator);
}

function validateSortValue(sortValue) {
  return ALLOWED_SORT_VALUES.includes(sortValue);
}

function validateAndSanitizeFilterValue(filterType, filterValue) {
  switch (filterType) {
    case 'price':
    case 'rating':
    case 'inStock':
    case 'outOfStock':
      const numValue = parseInt(filterValue);
      return isNaN(numValue) ? null : numValue;
    case 'category':
      return typeof filterValue === 'string' && filterValue.trim().length > 0 
        ? filterValue.trim() 
        : null;
    default:
      return null;
  }
}

// Security: Safe filter object builder
function buildSafeFilterObject(filterArray) {
  const filterObj = {};
  
  for (const item of filterArray) {
    // Validate filter type
    if (!validateFilterType(item.filterType)) {
      console.warn(`Invalid filter type: ${item.filterType}`);
      continue;
    }
    
    // Validate operator
    if (!validateOperator(item.filterOperator)) {
      console.warn(`Invalid operator: ${item.filterOperator}`);
      continue;
    }
    
    // Validate and sanitize filter value
    const sanitizedValue = validateAndSanitizeFilterValue(item.filterType, item.filterValue);
    if (sanitizedValue === null) {
      console.warn(`Invalid filter value for ${item.filterType}: ${item.filterValue}`);
      continue;
    }
    
    // Build safe filter object
    filterObj[item.filterType] = {
      [item.filterOperator]: sanitizedValue,
    };
  }
  
  return filterObj;
}

const getAllProducts = asyncHandler(async (request, response) => {
  if (Object.prototype.hasOwnProperty.call(request.query, "mode")) {
    return response.status(400).json({ error: "UNSUPPORTED_QUERY_PARAMETER" });
  }

  const page = Math.max(1, Number.parseInt(request.query.page, 10) || 1);
  const pageSize = 12;
  const where = {
    isVisible: true,
    isBlindBox: true,
    isCollector: false,
    slug: "vanie-blind-box",
  };
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy: [{ title: "asc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.product.count({ where }),
  ]);

  return response.json({
    products: products.map((product) => ({
      id: product.id,
      slug: product.slug,
      title: product.title,
      price: product.price,
      mainImage: product.mainImage.startsWith("/")
        ? product.mainImage
        : `/${product.mainImage}`,
      inStock: product.inStock > 0,
      categoryId: product.categoryId,
      setId: product.setId,
      rarityTier: null,
    })),
    page,
    total,
    totalPages: Math.ceil(total / pageSize),
    pageSize,
  });
});

const getAllProductsOld = asyncHandler(async (request, response) => {
  const products = await prisma.product.findMany({
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });
  response.status(200).json(
    products.map((product) => ({
      ...product,
      images: parseProductImages(product.images),
    }))
  );
});

const createProduct = asyncHandler(async (request, response) => {
  const {
    merchantId,
    slug,
    title,
    mainImage,
    images,
    price,
    description,
    manufacturer,
    categoryId,
    inStock,
  } = request.body;

  if (!title) {
    throw new AppError("Missing required field: title", 400);
  }
  
  // Basic validation
  if (!merchantId) {
    throw new AppError("Missing required field: merchantId", 400);
  }
  
  if (!slug) {
    throw new AppError("Missing required field: slug", 400);
  }

  if (!price) {
    throw new AppError("Missing required field: price", 400);
  }

  if (!categoryId) {
    throw new AppError("Missing required field: categoryId", 400);
  }

  const product = await prisma.product.create({
    data: {
      merchantId,
      slug,
      title,
      mainImage,
      images: serializeProductImages(images),
      price,
      rating: 5,
      description,
      manufacturer,
      categoryId,
      inStock,
    },
  });
  return response.status(201).json({
    ...product,
    images: parseProductImages(product.images),
  });
});

// Method for updating existing product
const updateProduct = asyncHandler(async (request, response) => {
  const { id } = request.params;
  const {
    merchantId,
    slug,
    title,
    mainImage,
    images,
    price,
    rating,
    description,
    manufacturer,
    categoryId,
    inStock,
  } = request.body;

  // Basic validation
  if (!id) {
    throw new AppError("Product ID is required", 400);
  }

  // Finding a product by id
  const existingProduct = await prisma.product.findUnique({
    where: {
      id,
    },
  });

  if (!existingProduct) {
    throw new AppError("Product not found", 404);
  }

  // Updating found product
  const updatedProduct = await prisma.product.update({
    where: {
      id,
    },
    data: {
      merchantId: merchantId,
      title: title,
      mainImage: mainImage,
      images: Array.isArray(images)
        ? serializeProductImages(images)
        : existingProduct.images,
      slug: slug,
      price: price,
      rating: rating,
      description: description,
      manufacturer: manufacturer,
      categoryId: categoryId,
      inStock: inStock,
    },
  });

  return response.status(200).json({
    ...updatedProduct,
    images: parseProductImages(updatedProduct.images),
  });
});

// Method for deleting a product
const deleteProduct = asyncHandler(async (request, response) => {
  const { id } = request.params;

  if (!id) {
    throw new AppError("Product ID is required", 400);
  }

  // Check for related records in order_product table
  const relatedOrderProductItems = await prisma.customer_order_product.findMany({
    where: {
      productId: id,
    },
  });
  
  if(relatedOrderProductItems.length > 0){
    throw new AppError("Cannot delete product because of foreign key constraint", 400);
  }

  await prisma.product.delete({
    where: {
      id,
    },
  });
  return response.status(204).send();
});

const searchProducts = asyncHandler(async (request, response) => {
  const { query } = request.query;
  
  if (!query) {
    throw new AppError("Query parameter is required", 400);
  }

  const products = await prisma.product.findMany({
    where: {
      OR: [
        {
          title: {
            contains: query,
          },
        },
        {
          description: {
            contains: query,
          },
        },
      ],
    },
  });

  return response.json(products);
});

const getProductById = asyncHandler(async (request, response) => {
  const { id } = request.params;
  
  if (!id) {
    throw new AppError("Product ID is required", 400);
  }

  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
    },
  });
  
  if (!product) {
    throw new AppError("Product not found", 404);
  }
  if (
    !product.isVisible ||
    !product.isBlindBox ||
    product.isCollector ||
    product.slug !== "vanie-blind-box"
  ) {
    throw new AppError("Product not found", 404);
  }
  
  return response.status(200).json({
    ...product,
    images: parseProductImages(product.images),
  });
});

module.exports = {
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductById,
};

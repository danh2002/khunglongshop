import { merchCategories } from "@/lib/merchCatalog";

type ShopSearchParams = Record<string, string | string[] | undefined>;

const getFirstValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const parseNonNegativeNumber = (
  value: string | undefined,
  fallback: number
) => {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) && parsedValue >= 0
    ? parsedValue
    : fallback;
};

export function buildShopProductsPath(
  slug: string[] | undefined,
  searchParams: ShopSearchParams
) {
  const inStock = getFirstValue(searchParams.inStock) === "true";
  const outOfStock = getFirstValue(searchParams.outOfStock) === "true";
  const price = parseNonNegativeNumber(
    getFirstValue(searchParams.price),
    3000000
  );
  const rating = parseNonNegativeNumber(
    getFirstValue(searchParams.rating),
    0
  );
  const page = Math.max(
    1,
    parseNonNegativeNumber(getFirstValue(searchParams.page), 1)
  );
  const sort = getFirstValue(searchParams.sort) || "defaultSort";
  const categoryName = slug?.[0]?.replace(/-/g, " ") || "";
  const isMerchCategory = merchCategories.includes(
    categoryName as (typeof merchCategories)[number]
  );

  const filters = [
    `filters[price][$lte]=${price}`,
    `filters[rating][$gte]=${rating}`,
  ];

  if (inStock && !outOfStock) {
    filters.push("filters[inStock][$gt]=0");
  } else if (outOfStock && !inStock) {
    filters.push("filters[inStock][$equals]=0");
  }

  if (categoryName && !isMerchCategory) {
    filters.push(
      `filters[category][$equals]=${encodeURIComponent(categoryName)}`
    );
  }

  return `/api/products?${filters.join("&")}&sort=${encodeURIComponent(
    sort
  )}&page=${page}`;
}

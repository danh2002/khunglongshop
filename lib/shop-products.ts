import { merchCategories } from "@/lib/merchCatalog";

type ShopSearchParams = Record<string, string | string[] | undefined>;

const singleValue = (value: string | string[] | undefined) =>
  Array.isArray(value) ? value[0] : value;

const positiveNumber = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
};

export function buildShopProductsPath(
  slug: string[] | undefined,
  searchParams: ShopSearchParams
) {
  const inStock = singleValue(searchParams.inStock) === "true";
  const outOfStock = singleValue(searchParams.outOfStock) === "true";
  const price = positiveNumber(singleValue(searchParams.price), 3000000);
  const rating = positiveNumber(singleValue(searchParams.rating), 0);
  const page = Math.max(1, positiveNumber(singleValue(searchParams.page), 1));
  const sort = singleValue(searchParams.sort) || "defaultSort";
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

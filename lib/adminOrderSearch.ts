import type { Prisma } from "@prisma/client";

function buildTermFilters(term: string): Prisma.Customer_orderWhereInput[] {
  const filters: Prisma.Customer_orderWhereInput[] = [
    { id: { contains: term } },
    { email: { contains: term } },
    { name: { contains: term } },
    { lastname: { contains: term } },
    { phone: { contains: term } },
  ];
  const orderNumber = Number(term);

  if (/^\d+$/.test(term) && Number.isSafeInteger(orderNumber)) {
    filters.push({ orderNumber });
  }

  return filters;
}

export function buildAdminOrderSearchWhere(
  search: string | null | undefined
): Prisma.Customer_orderWhereInput {
  const terms = search?.trim().split(/\s+/).filter(Boolean) ?? [];

  if (terms.length === 0) return {};

  return {
    AND: terms.map((term) => ({ OR: buildTermFilters(term) })),
  };
}

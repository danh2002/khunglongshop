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
  const raw = search?.trim() ?? "";
  if (!raw) return {};

  const terms = raw.split(/\s+/).filter(Boolean);

  if (terms.length === 0) return {};

  const termFilters = terms.map((term) => ({
    OR: buildTermFilters(term),
  }));

  if (terms.length === 1) {
    return { OR: buildTermFilters(terms[0]!) };
  }

  return {
    OR: [
      { AND: termFilters },
      {
        AND: [
          { name: { contains: terms[0]! } },
          {
            lastname: {
              contains: terms.slice(1).join(" "),
            },
          },
        ],
      },
      {
        AND: [
          { lastname: { contains: terms[0]! } },
          {
            name: {
              contains: terms.slice(1).join(" "),
            },
          },
        ],
      },
    ],
  };
}

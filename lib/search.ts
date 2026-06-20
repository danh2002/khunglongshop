export type PublicSearchParams = {
  q?: string | string[];
  search?: string | string[];
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function normalizeSearchQuery(params: PublicSearchParams) {
  const q = firstParam(params.q)?.trim() ?? "";
  if (q) return q;

  return firstParam(params.search)?.trim() ?? "";
}

type WishlistResponse = {
  data?: unknown;
  items?: unknown;
  wishlist?: unknown;
};

export function normalizeWishlistResponse(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const response = payload as WishlistResponse;
  if (Array.isArray(response.data)) return response.data;
  if (Array.isArray(response.wishlist)) return response.wishlist;
  if (Array.isArray(response.items)) return response.items;

  return [];
}

type WishlistResponse = {
  data?: unknown;
  items?: unknown;
  wishlist?: unknown;
};

export function normalizeWishlistResponse(payload: unknown): any[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const wishlistResponse = payload as WishlistResponse;
  if (Array.isArray(wishlistResponse.data)) return wishlistResponse.data;
  if (Array.isArray(wishlistResponse.wishlist)) {
    return wishlistResponse.wishlist;
  }
  if (Array.isArray(wishlistResponse.items)) return wishlistResponse.items;

  return [];
}

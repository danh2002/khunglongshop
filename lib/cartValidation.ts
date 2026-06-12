import type { ProductInCart } from "@/app/_zustand/store";

export type CartItemStatus = "OK" | "OUT_OF_STOCK" | "NOT_FOUND" | "HIDDEN";

export type CartValidationResult = {
  valid: boolean;
  items: Array<{
    productId: string;
    status: CartItemStatus;
    currentPrice: number;
    priceChanged: boolean;
  }>;
};

export async function validateCartItems(products: ProductInCart[]) {
  const response = await fetch("/api/catalog/validate-items", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: products.map((product) => ({
        productId: product.id,
        quantity: product.amount,
        clientPrice: product.price,
      })),
    }),
  });
  if (!response.ok) throw new Error("CART_VALIDATION_FAILED");
  return (await response.json()) as CartValidationResult;
}

export const cartStatusMessage: Record<Exclude<CartItemStatus, "OK">, string> = {
  HIDDEN:
    "Sản phẩm này không còn được bán riêng. Vui lòng xóa khỏi giỏ hàng để tiếp tục thanh toán.",
  NOT_FOUND:
    "Sản phẩm này không còn tồn tại. Vui lòng xóa khỏi giỏ hàng để tiếp tục thanh toán.",
  OUT_OF_STOCK:
    "Sản phẩm không đủ tồn kho cho số lượng đã chọn.",
};

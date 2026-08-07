import { describe, expect, it, vi } from "vitest";
import {
  InventoryReservationError,
  reserveInventoryForItems,
} from "@/lib/orderInventory";

describe("reserveInventoryForItems", () => {
  it("reserves every order line with a conditional decrement", async () => {
    const updateMany = vi
      .fn()
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    const tx = { product: { updateMany } } as never;

    await reserveInventoryForItems(
      [
        { productId: "product-1", quantity: 2 },
        { productId: "product-2", quantity: 1 },
      ],
      tx
    );

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenNthCalledWith(1, {
      where: { id: "product-1", inStock: { gte: 2 } },
      data: { inStock: { decrement: 2 } },
    });
  });

  it("throws a typed error when any line cannot be reserved", async () => {
    const tx = {
      product: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    } as never;

    await expect(
      reserveInventoryForItems([{ productId: "product-1", quantity: 2 }], tx)
    ).rejects.toBeInstanceOf(InventoryReservationError);
  });
});

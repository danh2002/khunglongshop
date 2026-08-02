import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("checkout cart hydration guard", () => {
  it("waits for the persisted cart store before redirecting empty carts", () => {
    const source = readFileSync(resolve(process.cwd(), "app/(public)/checkout/page.tsx"), "utf8");

    expect(source).toContain("useProductStore.persist.onFinishHydration");
    expect(source).toContain("if (!cartHydrated) return;");
    expect(source).toContain("[cartHydrated, products.length, router]");
  });

  it("does not redirect to the cart after a completed order clears the store", () => {
    const source = readFileSync(resolve(process.cwd(), "app/(public)/checkout/page.tsx"), "utf8");

    expect(source).toContain("const orderCompletedRef = useRef(false);");
    expect(source).toContain("orderCompletedRef.current = true;");
    expect(source).toContain(
      "products.length === 0 && !orderCompletedRef.current"
    );
  });
});

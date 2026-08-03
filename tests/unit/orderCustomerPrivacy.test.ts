import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("customer order privacy", () => {
  it("shows only purchased products on the confirmation page", () => {
    const page = source("app/(public)/order-confirmation/[id]/page.tsx");

    expect(page).toContain(
      'import { normalizeCatalogImage } from "@/lib/publicCatalog"'
    );
    expect(page).toContain(
      "src={normalizeCatalogImage(item.product.mainImage)}"
    );
    expect(page).not.toContain("blindBoxAllocations");
    expect(page).not.toContain("redemptionCode");
  });

  it("does not expose blind-box results or codes from customer order APIs", () => {
    const createOrderRoute = source("app/api/orders/route.ts");
    const accountOrderRoute = source("app/api/account/orders/[id]/route.ts");

    expect(createOrderRoute).not.toContain("blindBoxResults");
    expect(accountOrderRoute).not.toContain("blindBoxResults");
    expect(accountOrderRoute).not.toContain("redemptionCode");
    expect(accountOrderRoute).not.toContain("blindBoxAllocations");
  });
});

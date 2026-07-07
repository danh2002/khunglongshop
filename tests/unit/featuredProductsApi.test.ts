import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("featured products API wiring", () => {
  it("requires admin auth on admin routes", () => {
    const listRoute = source("app/api/admin/featured-products/route.ts");
    const detailRoute = source("app/api/admin/featured-products/[productId]/route.ts");
    const reorderRoute = source("app/api/admin/featured-products/reorder/route.ts");

    expect(listRoute).toContain("requireAdminApi");
    expect(detailRoute).toContain("requireAdminApi");
    expect(reorderRoute).toContain("requireAdminApi");
  });

  it("revalidates the homepage after featured product mutations", () => {
    const listRoute = source("app/api/admin/featured-products/route.ts");
    const detailRoute = source("app/api/admin/featured-products/[productId]/route.ts");
    const reorderRoute = source("app/api/admin/featured-products/reorder/route.ts");

    expect(listRoute).toContain('revalidatePath("/")');
    expect(detailRoute).toContain('revalidatePath("/")');
    expect(reorderRoute).toContain('revalidatePath("/")');
  });

  it("updates reorder atomically and keeps public route unauthenticated", () => {
    const reorderRoute = source("app/api/admin/featured-products/reorder/route.ts");
    const publicRoute = source("app/api/public/featured-products/route.ts");

    expect(reorderRoute).toContain("prisma.$transaction");
    expect(publicRoute).not.toContain("requireAdminApi");
  });

  it("exposes the admin sidebar link", () => {
    const sidebar = source("components/DashboardSidebar.tsx");

    expect(sidebar).toContain('href: "/admin/featured-products"');
    expect(sidebar).toContain('label: "Sản phẩm nổi bật"');
  });
});

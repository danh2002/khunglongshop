import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("homepage slider admin API wiring", () => {
  it("requires admin auth and revalidates the homepage after mutations", () => {
    const listRoute = source("app/api/admin/homepage-slider/route.ts");
    const detailRoute = source("app/api/admin/homepage-slider/[id]/route.ts");

    expect(listRoute).toContain("requireAdminApi");
    expect(detailRoute).toContain("requireAdminApi");
    expect(listRoute).toContain('revalidatePath("/")');
    expect(detailRoute.match(/revalidatePath\("\/"\)/g)).toHaveLength(2);
  });

  it("orders slides deterministically and exposes the admin navigation item", () => {
    const listRoute = source("app/api/admin/homepage-slider/route.ts");
    const publicHelper = source("lib/homepageSlides.ts");
    const sidebar = source("components/DashboardSidebar.tsx");

    expect(listRoute).toContain('orderBy: [{ sortOrder: "asc" }, { id: "asc" }]');
    expect(publicHelper).toContain('where: { isActive: true }');
    expect(publicHelper).toContain('orderBy: [{ sortOrder: "asc" }, { id: "asc" }]');
    expect(sidebar).toContain('href: "/admin/homepage-slider"');
    expect(sidebar).toContain('label: "Slider trang chủ"');
  });
});

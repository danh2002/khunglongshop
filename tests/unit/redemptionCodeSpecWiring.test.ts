import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("issue 5 redemption-code spec wiring", () => {
  it("creates admin redemption codes as single-product unowned atomic requests with audit logging", () => {
    const route = source("app/api/admin/redemption-codes/route.ts");

    expect(route).toContain(".strict()");
    expect(route).toContain("quantity: z.number().int().min(1).max(500)");
    expect(route).not.toContain("orderId: z.string()");
    expect(route).not.toContain("userId: z.string()");
    expect(route).toContain("prisma.$transaction");
    expect(route).toContain("redemptionCode.createMany");
    expect(route).toContain("REDEMPTION_CODES_CREATED");
    expect(route).toContain("userId: null");
    expect(route).toContain("orderId: null");
    expect(route).toContain("product: {");
  });

  it("filters admin products to fully valid collector products with collectorOnly=true", () => {
    const route = source("app/api/admin/products/route.ts");

    expect(route).toContain('searchParams.get("collectorOnly") === "true"');
    expect(route).toContain("isCollector: true");
    expect(route).toContain("setId: { not: null }");
    expect(route).toContain("setSlotNumber: { not: null }");
  });

  it("checks redeem role eligibility before rate limiting", () => {
    const route = source("app/api/merch/redeem-code/route.ts");
    const roleCheckIndex = route.indexOf("REDEEM_ROLE_NOT_ALLOWED");
    const rateLimitIndex = route.indexOf("isRateLimited(`redeem-code");

    expect(roleCheckIndex).toBeGreaterThan(-1);
    expect(rateLimitIndex).toBeGreaterThan(-1);
    expect(roleCheckIndex).toBeLessThan(rateLimitIndex);
  });

  it("types and displays duplicate ownership counts in the collection UI", () => {
    const page = source("app/account/collection/page.tsx");

    expect(page).toContain("ownedCount: number");
    expect(page).toContain("OwnedCountBadge");
    expect(page).toContain("x{slot.ownedCount}");
    expect(page).toContain("normalizeCatalogImage(slot.product.image)");
  });

  it("disables prefetch for protected account collection links", () => {
    const accountPage = source("app/account/page.tsx");
    const header = source("components/Header.tsx");
    const footer = source("components/Footer.tsx");

    expect(accountPage).toContain('href="/account/collection" prefetch={false}');
    expect(header).toContain('href="/account/collection" prefetch={false}');
    expect(footer).toContain('href="/account/collection" prefetch={false}');
  });

  it("returns a clear registration error when Resend domain is not verified", () => {
    const email = source("lib/email.ts");
    const otpService = source("lib/otp/otpService.ts");
    const registerPage = source("app/register/page.tsx");

    expect(email).toContain("EMAIL_PROVIDER_DOMAIN_NOT_VERIFIED");
    expect(otpService).toContain('OtpServiceError("EMAIL_PROVIDER_DOMAIN_NOT_VERIFIED", 503)');
    expect(registerPage).toContain("EMAIL_PROVIDER_DOMAIN_NOT_VERIFIED");
  });

  it("exposes a manual-copy fallback for generated codes", () => {
    const form = source("components/admin/RedemptionCodeCreateForm.tsx");

    expect(form).toContain("navigator.clipboard?.writeText");
    expect(form).toContain("readOnly");
    expect(form).toContain('aria-label="Code vừa tạo"');
    expect(form).toContain("collectorOnly");
  });

  it("renders the shop visibility label without mojibake", () => {
    const form = source("components/AdminProductForm.tsx");

    expect(form).toContain("Hiển thị ở shop");
    expect(form).not.toContain("Hiá»ƒn thá»‹ á»Ÿ shop");
  });

  it("uses blind-box set data for the product detail collection copy", () => {
    const page = source("app/product/[productSlug]/page.tsx");

    expect(page).toContain("product.blindBoxSet?.name");
    expect(page).toContain("product.blindBoxSet?.totalSlots");
    expect(page).toContain("Bộ sưu tập {sanitize(collectionName)}");
    expect(page).toContain("{collectionTotalSlots} mẫu {sanitize(collectionName)} có thể nhận");
    expect(page).not.toContain("Bộ sưu tập Vanie");
    expect(page).not.toContain("10 mẫu Vanie");
  });

  it("keeps category navigation limited to blind boxes and all products", () => {
    const header = source("components/Header.tsx");

    expect(header).not.toContain("dynamicCategories.map");
    expect(header).toContain('href="/bo-suu-tap?category=hop-mu"');
    expect(header).toContain('href="/bo-suu-tap?nhanvat=all"');
  });

  it("keeps the root layout static while hydrating locale client-side", () => {
    const layout = source("app/layout.tsx");
    const languageProvider = source("components/LanguageProvider.tsx");

    expect(layout).not.toContain("force-dynamic");
    expect(layout).not.toContain("getServerLocale");
    expect(layout).not.toContain("getServerSession");
    expect(languageProvider).toContain("initialLocale?: string");
    expect(languageProvider).toContain("document.cookie.match");
    expect(languageProvider).toContain("site_lang");
  });

  it("renders character collection cards as view-only", () => {
    const products = source("components/Products.tsx");
    const item = source("components/ProductItem.tsx");
    const page = source("app/product/[productSlug]/page.tsx");

    expect(products).toContain("buildCollectorGalleryWhere({ characterSlug })");
    expect(products).toContain("viewOnly={isCollectorGallery}");
    expect(item).toContain("viewOnly = false");
    expect(item).toContain("{!viewOnly ? (");
    expect(page).toContain("isCollectorProduct");
    expect(page).toContain("buildPublicProductDetailWhere(productSlug)");
    expect(page).toContain("{!isCollectorProduct ? <SingleProductDynamicFields product={product} /> : null}");
  });

  it("normalizes wishlist item image paths before passing them to next/image", () => {
    const item = source("components/WishItem.tsx");

    expect(item).toContain('import { normalizeCatalogImage } from "@/lib/publicCatalog"');
    expect(item).toContain('src={normalizeCatalogImage(image || "/images/logo.png")}');
    expect(item).not.toContain("src={image ? `/${image}`");
  });

  it("normalizes account order image paths before passing them to next/image", () => {
    const ordersPage = source("app/account/orders/page.tsx");
    const orderDetailPage = source("app/account/orders/[id]/page.tsx");

    expect(ordersPage).toContain('import { normalizeCatalogImage } from "@/lib/publicCatalog"');
    expect(ordersPage).toContain("src={normalizeCatalogImage(product.image)}");
    expect(ordersPage).not.toContain("src={`/${product.image}`}");

    expect(orderDetailPage).toContain('import { normalizeCatalogImage } from "@/lib/publicCatalog"');
    expect(orderDetailPage).toContain("src={normalizeCatalogImage(product.image)}");
    expect(orderDetailPage).not.toContain("result.product.mainImage");
    expect(orderDetailPage).not.toContain("blindBoxResults");
    expect(orderDetailPage).not.toContain("src={`/${product.image}`}");
    expect(orderDetailPage).not.toContain('startsWith("/")');
  });

  it("keeps account profile stats on bounded database queries", () => {
    const route = source("app/api/account/profile/route.ts");

    expect(route).toContain("prisma.customer_order.count");
    expect(route).not.toContain("orders.length");
    expect(route).not.toContain("const [orders");
    expect(route).toContain("prisma.redemptionCode.groupBy");
    expect(route).toContain('by: ["productId"]');
  });
});

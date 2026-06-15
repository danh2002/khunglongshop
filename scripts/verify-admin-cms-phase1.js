const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assertContains(file, pattern, message) {
  const content = read(file);
  if (!pattern.test(content)) {
    throw new Error(`${message} (${file})`);
  }
}

function assertNotContains(file, pattern, message) {
  const content = read(file);
  if (pattern.test(content)) {
    throw new Error(`${message} (${file})`);
  }
}

function walk(relativeDir) {
  const dir = path.join(root, relativeDir);
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) return walk(relativePath);
    return relativePath.replace(/\\/g, "/");
  });
}

for (const schema of ["prisma/schema.prisma", "server/prisma/schema.prisma"]) {
  assertContains(schema, /enum\s+Role\s*\{[\s\S]*admin[\s\S]*user[\s\S]*\}/, "Schema must define Role enum");
  assertContains(schema, /role\s+Role\s+@default\(user\)/, "User.role must be non-null Role with user default");
  assertContains(schema, /@@index\(\[role\]\)/, "User.role must be indexed");
  assertContains(schema, /@@index\(\[categoryId\]\)/, "Product.categoryId must be indexed");
  assertContains(schema, /@@index\(\[merchantId\]\)/, "Product.merchantId must be indexed");
  assertContains(schema, /@@index\(\[setId\]\)/, "Product.setId must be indexed");
  assertContains(schema, /@@index\(\[inStock\]\)/, "Product.inStock must be indexed");
}

assertContains(
  "prisma/migrations/20260608131646_admin_cms_phase1_role_indexes/migration.sql",
  /UPDATE\s+`user`[\s\S]*`role`\s+IS\s+NULL[\s\S]*NOT\s+IN\s+\('admin',\s*'user'\)/,
  "Migration must normalize legacy roles before enum conversion"
);
assertContains("utils/adminAuth.ts", /requireAdminApi/, "Next.js admin API helper must exist");
assertNotContains("utils/adminAuth.ts", /\bas\s+any\b/, "Admin auth helper must avoid broad any casts");
assertContains("server/middleware/adminAuth.js", /getToken/, "Express admin auth must verify NextAuth token");
assertContains("server/routes/users.js", /\.post\(requireAdminSession,\s*createUser\)/, "Express user creation must require admin auth");
assertContains("server/routes/users.js", /\.put\(requireAdminSession,\s*updateUser\)/, "Express user update must require admin auth");
assertContains("server/routes/users.js", /\.delete\(requireAdminSession,\s*deleteUser\)/, "Express user delete must require admin auth");
assertContains(
  "server/routes/products.js",
  /\.post\(requireAdminSession,\s*createProduct\)/,
  "Express product creation must require admin auth"
);
assertContains(
  "server/routes/products.js",
  /\.put\(requireAdminSession,\s*updateProduct\)/,
  "Express product update must require admin auth"
);
assertContains(
  "server/routes/products.js",
  /\.delete\(requireAdminSession,\s*deleteProduct\)/,
  "Express product delete must require admin auth"
);
assertContains("lib/api.ts", /credentials:\s*['"]include['"]/, "API client must send cookies to Express");
assertContains("app/api/admin/users/route.ts", /requireAdminApi/, "Admin users list/create API must require admin auth");
assertContains("app/api/admin/users/route.ts", /_count:\s*\{[\s\S]*orders:\s*true[\s\S]*Wishlist:\s*true/, "User list must use Prisma _count");
assertContains(
  "app/api/admin/users/route.ts",
  /adminUserCreateSchema/,
  "User create must use the shared admin user schema"
);
assertContains(
  "lib/adminUserValidation.ts",
  /password:\s*commonValidations\.password/,
  "Shared admin user create schema must use the common password policy"
);
assertContains("app/api/admin/users/route.ts", /select:\s*\{[\s\S]*id:\s*true[\s\S]*email:\s*true[\s\S]*role:\s*true/, "User create response must select safe fields");
assertNotContains("app/api/admin/users/route.ts", /select:\s*\{[\s\S]*password:\s*true/, "User API must not select password");
assertContains("app/api/admin/users/[id]/route.ts", /SELF_DELETE_FORBIDDEN/, "User delete must block self-delete");
assertContains("app/api/admin/users/[id]/route.ts", /LAST_ADMIN_FORBIDDEN/, "User update/delete must block final-admin removal");
assertContains("app/api/admin/users/[id]/route.ts", /getDependencyCounts\(id,\s*tx\)/, "User delete dependency checks must run in the delete transaction");
assertContains("app/api/admin/users/[id]/route.ts", /tx\.user\.delete/, "User delete mutation must run in the same transaction");
assertContains("app/(dashboard)/admin/users/page.tsx", /\/api\/admin\/users/, "Admin users page must use admin API");
assertContains("app/(dashboard)/admin/users/page.tsx", /key=\{user\.id\}/, "Admin users table must use stable user id keys");
assertNotContains("app/(dashboard)/admin/users/page.tsx", /nanoid/, "Admin users page must not generate unstable row keys");
assertContains("app/(dashboard)/admin/users/new/page.tsx", /\/api\/admin\/users/, "Admin create user page must use admin API");
assertContains("app/(dashboard)/admin/users/[id]/page.tsx", /\/api\/admin\/users\/\$\{id\}/, "Admin user detail page must use admin API");
assertNotContains("app/(dashboard)/admin/users/new/page.tsx", /\/api\/users/, "Admin create user page must not call legacy Express user mutation");
assertNotContains("app/(dashboard)/admin/users/[id]/page.tsx", /\/api\/users/, "Admin user detail page must not call legacy Express user mutation");
assertContains("app/api/admin/products/route.ts", /requireAdminApi/, "Admin products list/create API must require admin auth");
assertContains("app/api/admin/products/[id]/route.ts", /requireAdminApi/, "Admin product detail API must require admin auth");
assertContains("app/api/admin/products/reference-data/route.ts", /requireAdminApi/, "Admin product reference data API must require admin auth");
assertContains("lib/adminProduct.ts", /normalizeSlug/, "Product API must normalize slugs");
assertContains("lib/adminProduct.ts", /\.regex\(\^?\/\^\\\/images\\\//, "Product images must be restricted to /images paths");
assertContains("lib/adminProduct.ts", /price:[\s\S]*\.int\(\)\.min\(0/, "Product price must be a non-negative VND integer");
assertContains("app/api/admin/products/route.ts", /COLLECTOR_SLOT_OCCUPIED/, "Product create must reject occupied collector slots");
assertContains("app/api/admin/products/[id]/route.ts", /PRODUCT_COLLECTOR_LOCKED/, "Product update must lock collector fields after codes exist");
assertContains("app/api/admin/products/[id]/route.ts", /PRODUCT_IN_COLLECTOR_SET/, "Product delete must reject slotted collector products");
assertContains("app/api/admin/products/[id]/route.ts", /customer_order_product\.count/, "Product delete must check order history");
assertContains("app/api/admin/products/[id]/route.ts", /redemptionCode\.count/, "Product delete must check redemption code history");
assertContains("app/api/admin/products/[id]/route.ts", /bulk_upload_item\.count/, "Product delete must check bulk upload history");
assertContains("app/(dashboard)/admin/products/page.tsx", /\/api\/admin\/products/, "Admin products page must use admin API");
assertContains("app/(dashboard)/admin/products/page.tsx", /key=\{product\.id\}/, "Admin products table must use stable product id keys");
assertNotContains("app/(dashboard)/admin/products/page.tsx", /nanoid/, "Admin products page must not generate unstable row keys");
assertContains("app/(dashboard)/admin/products/new/page.tsx", /\/api\/admin\/products/, "Admin create product page must use admin API");
assertContains("app/(dashboard)/admin/products/[id]/page.tsx", /\/api\/admin\/products\/\$\{id\}/, "Admin product detail page must use admin API");
assertNotContains("app/(dashboard)/admin/products/new/page.tsx", /\/api\/products/, "Admin create product page must not call legacy Express product mutation");
assertNotContains("app/(dashboard)/admin/products/[id]/page.tsx", /\/api\/products/, "Admin product detail page must not call legacy Express product mutation");
assertContains("app/(dashboard)/admin/layout.tsx", /<DashboardSidebar \/>/, "Admin routes must use a shared dashboard sidebar layout");
assertContains("components/DashboardSidebar.tsx", /aria-label="Điều hướng quản trị"/, "Admin sidebar must expose a navigation label");
assertContains("components/DashboardSidebar.tsx", /aria-current=\{active \? "page" : undefined\}/, "Admin sidebar must mark the active route");
assertContains("components/DashboardSidebar.tsx", /focus-visible:outline-\[#e85d00\]/, "Admin sidebar links must have a visible keyboard focus state");
assertContains("components/DashboardSidebar.tsx", /max-lg:overflow-x-auto/, "Admin sidebar must support compact mobile navigation");

for (const file of walk("app/(dashboard)/admin").filter((file) => file.endsWith("/page.tsx"))) {
  assertNotContains(file, /<DashboardSidebar \/>/, "Admin pages must not render their own sidebar");
  assertNotContains(file, /import DashboardSidebar from "@\/components\/DashboardSidebar"/, "Admin pages must not import the sidebar directly");
  assertNotContains(file, /import \{ DashboardSidebar/, "Admin pages must not import the sidebar from the component barrel");
}

console.log("Admin CMS phase 1/2/3/4 regression checks passed.");

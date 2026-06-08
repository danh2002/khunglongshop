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

assertContains("prisma/schema.prisma", /userId\s+String\?/, "Customer_order must store a nullable userId");
assertContains("prisma/schema.prisma", /orders\s+Customer_order\[\]/, "User must expose order relation");
assertContains("server/controllers/customer_orders.js", /resolveOrderUserId/, "Express order creation must validate order user ownership");
assertContains("server/controllers/customer_orders.js", /userId:\s*orderUserId/, "Express order creation must persist validated userId");
assertContains("lib/accountOrders.ts", /userId:\s*null[\s\S]*email:\s*legacyEmail/, "Legacy email fallback must only apply to null-userId orders");
assertContains("app/api/account/orders/route.ts", /getAccountOrderOwnershipWhere/, "Orders list API must use ownership filter");
assertContains("app/api/account/orders/[id]/route.ts", /getAccountOrderOwnershipWhere/, "Order detail API must use ownership filter");
assertContains("middleware.ts", /"\/account"/, "Account pages must be protected by middleware");
assertNotContains("app/register/page.tsx", /target\[[0-9]+\]/, "Register form must not rely on fragile field indexes");
assertNotContains(
  "app/login/page.tsx",
  /password\.length\s*<\s*8/,
  "Login must allow existing passwords shorter than the registration minimum"
);

console.log("Account auth regression checks passed.");

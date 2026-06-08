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

assertContains(
  "app/api/merch/my-collection/route.ts",
  /isUnlocked\s*=\s*Boolean\(code\)/,
  "Collection slots must unlock from used redemption codes only"
);
assertContains(
  "app/api/merch/my-collection/route.ts",
  /product:\s*product\s*\?/,
  "Collection slots must expose product previews before unlock"
);
assertContains(
  "app/api/merch/my-collection/route.ts",
  /code:\s*code\?\.code\s*\?\?\s*null/,
  "Locked collection slots must not expose a redemption code"
);
assertContains(
  "lib/collectorService.ts",
  /isUsed:\s*true/,
  "Set completion must count redeemed product codes"
);
assertContains(
  "lib/collectorService.ts",
  /updateMany\(\{\s*where:\s*\{[\s\S]*isUsed:\s*false/,
  "Redeeming a product code must guard against reusing an already-used code"
);
assertContains(
  "app/api/merch/redeem-code/route.ts",
  /MAX_REQUESTS\s*=\s*(?:1[0-9]|[2-9][0-9])/,
  "Redeem endpoint must allow a ten-code collection test while retaining a rate limit"
);

console.log("Collector unlock regression checks passed.");

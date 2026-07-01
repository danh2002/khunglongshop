const fs = require("fs");
const path = require("path");
const { PrismaClient } = require("@prisma/client");

const envFile = process.argv.find((arg) => arg.startsWith("--env="))?.slice("--env=".length)
  ?? ".env.migration.local";
const wipeTarget = process.argv.includes("--wipe-target");

function readEnv(filePath) {
  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Env file not found: ${absolutePath}`);
  }

  const result = {};
  for (const line of fs.readFileSync(absolutePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();
    value = value.replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function maskUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    url.username = url.username ? "***" : "";
    url.password = url.password ? "***" : "";
    return url.toString();
  } catch {
    return "<invalid url>";
  }
}

const env = readEnv(envFile);
const sourceUrl = env.SOURCE_DATABASE_URL;
const targetUrl = env.TARGET_DATABASE_URL;

if (!sourceUrl || !targetUrl) {
  throw new Error("SOURCE_DATABASE_URL and TARGET_DATABASE_URL are required.");
}

if (sourceUrl === targetUrl) {
  throw new Error("Source and target database URLs must be different.");
}

const source = new PrismaClient({
  datasources: { db: { url: sourceUrl } },
  log: ["error"],
});
const target = new PrismaClient({
  datasources: { db: { url: targetUrl } },
  log: ["error"],
});

const models = [
  "user",
  "category",
  "merchant",
  "siteSettings",
  "homepageSliderSlide",
  "collectorSet",
  "product",
  "image",
  "blindBoxPoolVersion",
  "blindBoxPoolEntry",
  "customer_order",
  "customer_order_product",
  "blindBoxAllocation",
  "redemptionCode",
  "setReward",
  "wishlist",
  "notification",
  "adminAuditLog",
  "otpChallenge",
  "otpRateLimitEvent",
  "otpAuditLog",
  "bulk_upload_batch",
  "bulk_upload_item",
];

async function countAll(client) {
  const counts = {};
  for (const model of models) {
    counts[model] = await client[model].count();
  }
  return counts;
}

async function copyModel(model) {
  const rows = await source[model].findMany();
  if (rows.length === 0) {
    console.log(`${model}: 0 rows`);
    return;
  }

  const batchSize = 250;
  let copied = 0;
  for (let index = 0; index < rows.length; index += batchSize) {
    const batch = rows.slice(index, index + batchSize);
    await target[model].createMany({
      data: batch,
      skipDuplicates: true,
    });
    copied += batch.length;
  }
  console.log(`${model}: copied ${copied} rows`);
}

async function main() {
  console.log("Source:", maskUrl(sourceUrl));
  console.log("Target:", maskUrl(targetUrl));

  await source.$connect();
  await target.$connect();

  const sourceCounts = await countAll(source);
  const targetCountsBefore = await countAll(target);
  const targetHasData = Object.values(targetCountsBefore).some((count) => count > 0);

  console.log("Source counts:", sourceCounts);
  console.log("Target counts before:", targetCountsBefore);

  if (targetHasData && !wipeTarget) {
    throw new Error("Target database is not empty. Re-run with --wipe-target to replace it.");
  }

  if (wipeTarget) {
    console.log("Wiping target database...");
    for (const model of [...models].reverse()) {
      await target[model].deleteMany();
    }
  }

  for (const model of models) {
    await copyModel(model);
  }

  const targetCountsAfter = await countAll(target);
  console.log("Target counts after:", targetCountsAfter);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });

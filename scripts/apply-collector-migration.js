const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function columnExists(tableName, columnName) {
  const rows = await prisma.$queryRaw`
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
      AND COLUMN_NAME = ${columnName}
  `;

  return rows.length > 0;
}

async function tableExists(tableName) {
  const rows = await prisma.$queryRaw`
    SELECT TABLE_NAME
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = ${tableName}
  `;

  return rows.length > 0;
}

async function constraintExists(constraintName) {
  const rows = await prisma.$queryRaw`
    SELECT CONSTRAINT_NAME
    FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
    WHERE TABLE_SCHEMA = DATABASE()
      AND CONSTRAINT_NAME = ${constraintName}
  `;

  return rows.length > 0;
}

async function migrationExists(migrationName) {
  const rows = await prisma.$queryRaw`
    SELECT migration_name
    FROM _prisma_migrations
    WHERE migration_name = ${migrationName}
  `;

  return rows.length > 0;
}

async function exec(sql) {
  await prisma.$executeRawUnsafe(sql);
}

async function main() {
  if (!(await tableExists("CollectorSet"))) {
    await exec(`
      CREATE TABLE \`CollectorSet\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`name\` VARCHAR(191) NOT NULL,
        \`description\` VARCHAR(191) NULL,
        \`totalSlots\` INTEGER NOT NULL,
        \`rewardDescription\` VARCHAR(191) NULL,
        \`rewardCodeTemplate\` VARCHAR(191) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`updatedAt\` DATETIME(3) NOT NULL,
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  if (!(await tableExists("RedemptionCode"))) {
    await exec(`
      CREATE TABLE \`RedemptionCode\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`code\` VARCHAR(191) NOT NULL,
        \`productId\` VARCHAR(191) NOT NULL,
        \`orderId\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`isUsed\` BOOLEAN NOT NULL DEFAULT false,
        \`usedAt\` DATETIME(3) NULL,
        \`createdAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        UNIQUE INDEX \`RedemptionCode_code_key\`(\`code\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  if (!(await tableExists("SetReward"))) {
    await exec(`
      CREATE TABLE \`SetReward\` (
        \`id\` VARCHAR(191) NOT NULL,
        \`userId\` VARCHAR(191) NOT NULL,
        \`setId\` VARCHAR(191) NOT NULL,
        \`rewardCode\` VARCHAR(191) NOT NULL,
        \`grantedAt\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        \`isClaimed\` BOOLEAN NOT NULL DEFAULT false,
        \`claimedAt\` DATETIME(3) NULL,
        UNIQUE INDEX \`SetReward_rewardCode_key\`(\`rewardCode\`),
        PRIMARY KEY (\`id\`)
      ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
    `);
  }

  if (!(await columnExists("Product", "setId"))) {
    await exec("ALTER TABLE `Product` ADD COLUMN `setId` VARCHAR(191) NULL");
  }

  if (!(await columnExists("Product", "setSlotNumber"))) {
    await exec("ALTER TABLE `Product` ADD COLUMN `setSlotNumber` INTEGER NULL");
  }

  if (!(await columnExists("Product", "isCollector"))) {
    await exec("ALTER TABLE `Product` ADD COLUMN `isCollector` BOOLEAN NOT NULL DEFAULT false");
  }

  if (!(await constraintExists("Product_setId_fkey"))) {
    await exec("ALTER TABLE `Product` ADD CONSTRAINT `Product_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `CollectorSet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE");
  }

  if (!(await constraintExists("SetReward_setId_fkey"))) {
    await exec("ALTER TABLE `SetReward` ADD CONSTRAINT `SetReward_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `CollectorSet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE");
  }

  if (!(await migrationExists("20260603000000_add_collector_system"))) {
    await exec(`
      INSERT INTO \`_prisma_migrations\` (
        \`id\`,
        \`checksum\`,
        \`finished_at\`,
        \`migration_name\`,
        \`logs\`,
        \`rolled_back_at\`,
        \`started_at\`,
        \`applied_steps_count\`
      ) VALUES (
        UUID(),
        'manual-collector-system',
        NOW(3),
        '20260603000000_add_collector_system',
        'Applied manually because prisma migrate dev schema engine failed in this environment.',
        NULL,
        NOW(3),
        1
      )
    `);
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

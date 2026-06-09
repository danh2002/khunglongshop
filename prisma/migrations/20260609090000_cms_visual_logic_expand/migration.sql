-- CMS visual/logic rollout: expand only.
-- Run `node scripts/preflight-cms-visual-logic.js` before applying this migration.

-- Normalize free-form values before converting columns to enums.
UPDATE `Customer_order`
SET `status` = CASE
  WHEN LOWER(`status`) IN ('processing', 'packed') THEN 'PROCESSING'
  WHEN LOWER(`status`) IN ('shipped', 'shipping') THEN 'SHIPPED'
  WHEN LOWER(`status`) = 'delivered' THEN 'DELIVERED'
  WHEN LOWER(`status`) IN ('cancelled', 'canceled') THEN 'CANCELLED'
  ELSE 'PENDING'
END;

UPDATE `Merchant`
SET `status` = CASE
  WHEN LOWER(`status`) = 'inactive' THEN 'INACTIVE'
  ELSE 'ACTIVE'
END;

-- Product history must survive category deletion.
ALTER TABLE `Product` DROP FOREIGN KEY `Product_categoryId_fkey`;

ALTER TABLE `Customer_order`
  MODIFY `status` ENUM('PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED')
  NOT NULL DEFAULT 'PENDING';

ALTER TABLE `customer_order_product`
  ADD COLUMN `productSlug` VARCHAR(191) NULL,
  ADD COLUMN `productTitle` VARCHAR(191) NULL,
  ADD COLUMN `snapshotSource`
    ENUM('CHECKOUT', 'BACKFILL_DERIVED', 'BACKFILL_ESTIMATE') NULL,
  ADD COLUMN `unitPrice` INTEGER NULL;

ALTER TABLE `Merchant`
  MODIFY `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE';

ALTER TABLE `RedemptionCode`
  ADD COLUMN `status`
    ENUM('ACTIVE', 'REDEEMED', 'DISABLED') NOT NULL DEFAULT 'ACTIVE',
  MODIFY `orderId` VARCHAR(191) NULL,
  MODIFY `userId` VARCHAR(191) NULL;

-- Legacy anomaly is intentionally ACTIVE: isUsed=true without usedAt is not proof of redemption.
UPDATE `RedemptionCode`
SET `status` = 'REDEEMED'
WHERE `isUsed` = true AND `usedAt` IS NOT NULL;

UPDATE `RedemptionCode`
SET `status` = 'ACTIVE'
WHERE `isUsed` = true AND `usedAt` IS NULL;

ALTER TABLE `User`
  ADD COLUMN `deactivatedAt` DATETIME(3) NULL,
  ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE `SiteSettings` (
  `id` INTEGER NOT NULL DEFAULT 1,
  `siteName` VARCHAR(191) NOT NULL DEFAULT 'Khủng Long Shop',
  `supportEmail` VARCHAR(191) NULL,
  `supportPhone` VARCHAR(191) NULL,
  `shippingNotice` TEXT NULL,
  `maintenanceMode` BOOLEAN NOT NULL DEFAULT false,
  `defaultLocale` VARCHAR(191) NOT NULL DEFAULT 'vi',
  `updatedById` VARCHAR(191) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `SiteSettings`
  (`id`, `siteName`, `maintenanceMode`, `defaultLocale`, `createdAt`, `updatedAt`)
VALUES
  (1, 'Khủng Long Shop', false, 'vi', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

CREATE TABLE `AdminAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `actorId` VARCHAR(191) NOT NULL,
  `action` VARCHAR(191) NOT NULL,
  `entityType` VARCHAR(191) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `metadata` JSON NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX `AdminAuditLog_actorId_createdAt_idx`(`actorId`, `createdAt`),
  INDEX `AdminAuditLog_entityType_entityId_createdAt_idx`
    (`entityType`, `entityId`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `Customer_order_status_idx` ON `Customer_order`(`status`);
CREATE INDEX `Customer_order_dateTime_idx` ON `Customer_order`(`dateTime`);
CREATE INDEX `Merchant_status_idx` ON `Merchant`(`status`);
CREATE INDEX `RedemptionCode_orderId_idx` ON `RedemptionCode`(`orderId`);
CREATE INDEX `RedemptionCode_status_idx` ON `RedemptionCode`(`status`);
CREATE INDEX `RedemptionCode_userId_status_idx` ON `RedemptionCode`(`userId`, `status`);
CREATE INDEX `SetReward_setId_isClaimed_idx` ON `SetReward`(`setId`, `isClaimed`);
CREATE INDEX `SetReward_isClaimed_grantedAt_idx` ON `SetReward`(`isClaimed`, `grantedAt`);
CREATE INDEX `User_isActive_idx` ON `User`(`isActive`);

ALTER TABLE `Product`
  ADD CONSTRAINT `Product_categoryId_fkey`
  FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `RedemptionCode`
  ADD CONSTRAINT `RedemptionCode_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `RedemptionCode`
  ADD CONSTRAINT `RedemptionCode_orderId_fkey`
  FOREIGN KEY (`orderId`) REFERENCES `Customer_order`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `RedemptionCode`
  ADD CONSTRAINT `RedemptionCode_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `SetReward`
  ADD CONSTRAINT `SetReward_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `SiteSettings`
  ADD CONSTRAINT `SiteSettings_updatedById_fkey`
  FOREIGN KEY (`updatedById`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `AdminAuditLog`
  ADD CONSTRAINT `AdminAuditLog_actorId_fkey`
  FOREIGN KEY (`actorId`) REFERENCES `User`(`id`)
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE `Product` ADD COLUMN `blindBoxSetId` VARCHAR(191) NULL,
    ADD COLUMN `isBlindBox` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `RedemptionCode` ADD COLUMN `allocationId` VARCHAR(191) NULL,
    MODIFY `status` ENUM('ACTIVE', 'REDEEMED', 'DISABLED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE';

-- AlterTable
ALTER TABLE `Customer_order` ADD COLUMN `checkoutIdempotencyKey` VARCHAR(191) NULL,
    ADD COLUMN `checkoutRequestHash` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `customer_order_product` ADD COLUMN `poolVersionId` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `BlindBoxPoolVersion` (
    `id` VARCHAR(191) NOT NULL,
    `collectorSetId` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `status` ENUM('DRAFT', 'ACTIVE', 'ARCHIVED') NOT NULL DEFAULT 'DRAFT',
    `activeSetKey` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `publishedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BlindBoxPoolVersion_activeSetKey_key`(`activeSetKey`),
    INDEX `BlindBoxPoolVersion_collectorSetId_status_idx`(`collectorSetId`, `status`),
    UNIQUE INDEX `BlindBoxPoolVersion_collectorSetId_version_key`(`collectorSetId`, `version`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlindBoxPoolEntry` (
    `id` VARCHAR(191) NOT NULL,
    `poolVersionId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `slotNumber` INTEGER NOT NULL,
    `drawWeight` INTEGER NOT NULL,
    `rarityTier` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY') NOT NULL,

    INDEX `BlindBoxPoolEntry_productId_idx`(`productId`),
    UNIQUE INDEX `BlindBoxPoolEntry_poolVersionId_productId_key`(`poolVersionId`, `productId`),
    UNIQUE INDEX `BlindBoxPoolEntry_poolVersionId_slotNumber_key`(`poolVersionId`, `slotNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `BlindBoxAllocation` (
    `id` VARCHAR(191) NOT NULL,
    `allocationKey` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `orderItemId` VARCHAR(191) NOT NULL,
    `unitIndex` INTEGER NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `poolVersionId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'VOIDED') NOT NULL DEFAULT 'ACTIVE',
    `drawnAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `revealed` BOOLEAN NOT NULL DEFAULT false,
    `voidedAt` DATETIME(3) NULL,

    UNIQUE INDEX `BlindBoxAllocation_allocationKey_key`(`allocationKey`),
    INDEX `BlindBoxAllocation_orderId_idx`(`orderId`),
    INDEX `BlindBoxAllocation_userId_status_idx`(`userId`, `status`),
    INDEX `BlindBoxAllocation_productId_idx`(`productId`),
    INDEX `BlindBoxAllocation_poolVersionId_idx`(`poolVersionId`),
    UNIQUE INDEX `BlindBoxAllocation_orderItemId_unitIndex_key`(`orderItemId`, `unitIndex`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Product_isBlindBox_idx` ON `Product`(`isBlindBox`);

-- CreateIndex
CREATE INDEX `Product_blindBoxSetId_idx` ON `Product`(`blindBoxSetId`);

-- CreateIndex
CREATE UNIQUE INDEX `RedemptionCode_allocationId_key` ON `RedemptionCode`(`allocationId`);

-- CreateIndex
CREATE UNIQUE INDEX `Customer_order_userId_checkoutIdempotencyKey_key` ON `Customer_order`(`userId`, `checkoutIdempotencyKey`);

-- CreateIndex
CREATE INDEX `customer_order_product_customerOrderId_idx` ON `customer_order_product`(`customerOrderId`);

-- CreateIndex
CREATE INDEX `customer_order_product_productId_idx` ON `customer_order_product`(`productId`);

-- CreateIndex
CREATE INDEX `customer_order_product_poolVersionId_idx` ON `customer_order_product`(`poolVersionId`);

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_blindBoxSetId_fkey` FOREIGN KEY (`blindBoxSetId`) REFERENCES `CollectorSet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxPoolVersion` ADD CONSTRAINT `BlindBoxPoolVersion_collectorSetId_fkey` FOREIGN KEY (`collectorSetId`) REFERENCES `CollectorSet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxPoolEntry` ADD CONSTRAINT `BlindBoxPoolEntry_poolVersionId_fkey` FOREIGN KEY (`poolVersionId`) REFERENCES `BlindBoxPoolVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxPoolEntry` ADD CONSTRAINT `BlindBoxPoolEntry_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxAllocation` ADD CONSTRAINT `BlindBoxAllocation_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `Customer_order`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxAllocation` ADD CONSTRAINT `BlindBoxAllocation_orderItemId_fkey` FOREIGN KEY (`orderItemId`) REFERENCES `customer_order_product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxAllocation` ADD CONSTRAINT `BlindBoxAllocation_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxAllocation` ADD CONSTRAINT `BlindBoxAllocation_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `Product`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `BlindBoxAllocation` ADD CONSTRAINT `BlindBoxAllocation_poolVersionId_fkey` FOREIGN KEY (`poolVersionId`) REFERENCES `BlindBoxPoolVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RedemptionCode` ADD CONSTRAINT `RedemptionCode_allocationId_fkey` FOREIGN KEY (`allocationId`) REFERENCES `BlindBoxAllocation`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `customer_order_product` ADD CONSTRAINT `customer_order_product_poolVersionId_fkey` FOREIGN KEY (`poolVersionId`) REFERENCES `BlindBoxPoolVersion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;


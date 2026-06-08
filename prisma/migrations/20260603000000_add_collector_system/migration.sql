-- CreateTable
CREATE TABLE `CollectorSet` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `totalSlots` INTEGER NOT NULL,
    `rewardDescription` VARCHAR(191) NULL,
    `rewardCodeTemplate` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RedemptionCode` (
    `id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `productId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `isUsed` BOOLEAN NOT NULL DEFAULT false,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `RedemptionCode_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `SetReward` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `setId` VARCHAR(191) NOT NULL,
    `rewardCode` VARCHAR(191) NOT NULL,
    `grantedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isClaimed` BOOLEAN NOT NULL DEFAULT false,
    `claimedAt` DATETIME(3) NULL,

    UNIQUE INDEX `SetReward_rewardCode_key`(`rewardCode`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `Product`
    ADD COLUMN `setId` VARCHAR(191) NULL,
    ADD COLUMN `setSlotNumber` INTEGER NULL,
    ADD COLUMN `isCollector` BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE `Product` ADD CONSTRAINT `Product_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `CollectorSet`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SetReward` ADD CONSTRAINT `SetReward_setId_fkey` FOREIGN KEY (`setId`) REFERENCES `CollectorSet`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `FeaturedProduct` (
  `id` VARCHAR(191) NOT NULL,
  `productId` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `FeaturedProduct_productId_key`(`productId`),
  INDEX `FeaturedProduct_sortOrder_idx`(`sortOrder`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `FeaturedProduct`
  ADD CONSTRAINT `FeaturedProduct_productId_fkey`
  FOREIGN KEY (`productId`) REFERENCES `Product`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

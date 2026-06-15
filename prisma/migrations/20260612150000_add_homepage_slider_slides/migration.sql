CREATE TABLE `HomepageSliderSlide` (
  `id` VARCHAR(191) NOT NULL,
  `imageUrl` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `subtitle` VARCHAR(191) NULL,
  `eyebrow` VARCHAR(191) NULL,
  `ctaLabel` VARCHAR(191) NULL,
  `ctaUrl` VARCHAR(191) NULL,
  `altText` VARCHAR(191) NOT NULL,
  `sortOrder` INTEGER NOT NULL DEFAULT 0,
  `isActive` BOOLEAN NOT NULL DEFAULT true,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE INDEX `HomepageSliderSlide_isActive_sortOrder_idx`
  ON `HomepageSliderSlide`(`isActive`, `sortOrder`);

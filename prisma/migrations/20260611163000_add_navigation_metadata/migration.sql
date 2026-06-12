ALTER TABLE `Category`
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `icon` VARCHAR(500) NULL,
  ADD COLUMN `description` VARCHAR(1000) NULL,
  ADD UNIQUE INDEX `Category_slug_key`(`slug`);

ALTER TABLE `CollectorSet`
  ADD COLUMN `slug` VARCHAR(191) NULL,
  ADD COLUMN `image` VARCHAR(500) NULL,
  ADD UNIQUE INDEX `CollectorSet_slug_key`(`slug`);

/*
  Warnings:

  - Made the column `role` on table `user` required. This step will fail if there are existing NULL values in that column.

*/
-- Normalize legacy roles before converting to a non-null enum.
UPDATE `user`
SET `role` = 'user'
WHERE `role` IS NULL OR `role` NOT IN ('admin', 'user');

-- AlterTable
ALTER TABLE `user` MODIFY `role` ENUM('admin', 'user') NOT NULL DEFAULT 'user';

-- CreateIndex
CREATE INDEX `Product_setId_idx` ON `Product`(`setId`);

-- CreateIndex
CREATE INDEX `Product_inStock_idx` ON `Product`(`inStock`);

-- CreateIndex
CREATE INDEX `User_role_idx` ON `User`(`role`);

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_categoryId_fkey` TO `Product_categoryId_idx`;

-- RenameIndex
ALTER TABLE `product` RENAME INDEX `Product_merchantId_fkey` TO `Product_merchantId_idx`;

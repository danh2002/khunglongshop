ALTER TABLE `User` ADD COLUMN `phone` VARCHAR(191) NULL;
CREATE UNIQUE INDEX `User_phone_key` ON `User`(`phone`);

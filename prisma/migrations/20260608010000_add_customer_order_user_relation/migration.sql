ALTER TABLE `Customer_order` ADD COLUMN `userId` VARCHAR(191) NULL;

UPDATE `Customer_order` AS `co`
INNER JOIN `User` AS `u` ON LOWER(`co`.`email`) = LOWER(`u`.`email`)
SET `co`.`userId` = `u`.`id`
WHERE `co`.`userId` IS NULL;

CREATE INDEX `Customer_order_userId_idx` ON `Customer_order`(`userId`);
CREATE INDEX `Customer_order_email_idx` ON `Customer_order`(`email`);
CREATE INDEX `Customer_order_userId_dateTime_idx` ON `Customer_order`(`userId`, `dateTime`);

ALTER TABLE `Customer_order`
  ADD CONSTRAINT `Customer_order_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

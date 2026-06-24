-- Add orderNumber as nullable first so existing rows can be backfilled safely.
ALTER TABLE `Customer_order`
  ADD COLUMN `orderNumber` INT NULL;

-- Backfill existing rows deterministically starting at #100001.
SET @order_number := 100000;

UPDATE `Customer_order`
SET `orderNumber` = (@order_number := @order_number + 1)
ORDER BY `dateTime`, `id`;

-- Widen enum before writing new status values.
ALTER TABLE `Customer_order`
  MODIFY COLUMN `status` ENUM('PENDING','PENDING_PAYMENT','PROCESSING','SHIPPED','DELIVERED','COMPLETED','CANCELLED')
  NOT NULL DEFAULT 'PENDING';

-- Remap old status values to new enum values.
UPDATE `Customer_order` SET `status` = 'PENDING_PAYMENT' WHERE `status` = 'PENDING';
UPDATE `Customer_order` SET `status` = 'COMPLETED' WHERE `status` = 'DELIVERED';
UPDATE `Customer_order` SET `status` = 'COMPLETED' WHERE `status` = 'SHIPPED';

-- Narrow enum to the new status set.
ALTER TABLE `Customer_order`
  MODIFY COLUMN `status` ENUM('PENDING_PAYMENT','PROCESSING','COMPLETED','CANCELLED')
  NOT NULL DEFAULT 'PENDING_PAYMENT';

-- Enforce orderNumber constraints and keep future numbers at or above #100001.
ALTER TABLE `Customer_order`
  ADD UNIQUE INDEX `Customer_order_orderNumber_key` (`orderNumber`);

ALTER TABLE `Customer_order`
  MODIFY COLUMN `orderNumber` INT NOT NULL AUTO_INCREMENT;

ALTER TABLE `Customer_order`
  ADD INDEX `Customer_order_orderNumber_idx` (`orderNumber`);

ALTER TABLE `Customer_order`
  AUTO_INCREMENT = 100001;

ALTER TABLE `Customer_order`
  ADD COLUMN `customerClaimedAt` DATETIME(3) NULL,
  ADD COLUMN `customerClaimedRef` VARCHAR(500) NULL;

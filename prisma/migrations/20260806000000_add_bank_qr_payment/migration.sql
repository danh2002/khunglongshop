ALTER TABLE `Customer_order`
  ADD COLUMN `paymentRef` VARCHAR(25) NULL,
  ADD COLUMN `paymentExpiresAt` DATETIME(3) NULL,
  ADD COLUMN `paidAt` DATETIME(3) NULL,
  ADD COLUMN `paymentExpiredAt` DATETIME(3) NULL;

CREATE UNIQUE INDEX `Customer_order_paymentRef_key`
  ON `Customer_order`(`paymentRef`);

CREATE INDEX `Customer_order_status_paymentExpiresAt_idx`
  ON `Customer_order`(`status`, `paymentExpiresAt`);

CREATE INDEX `Customer_order_status_paymentExpiredAt_idx`
  ON `Customer_order`(`status`, `paymentExpiredAt`);

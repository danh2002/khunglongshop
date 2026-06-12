ALTER TABLE `product`
  ADD COLUMN `isVisible` BOOLEAN NOT NULL DEFAULT false;

UPDATE `product`
SET `isVisible` = CASE
  WHEN `slug` = 'vanie-blind-box' THEN true
  ELSE false
END;

CREATE INDEX `product_isVisible_isBlindBox_idx`
  ON `product`(`isVisible`, `isBlindBox`);

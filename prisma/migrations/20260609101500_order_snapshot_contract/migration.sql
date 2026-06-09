-- Contract only after `db:backfill:order-snapshots` reports nullRows=0.
ALTER TABLE `customer_order_product`
  MODIFY `productTitle` VARCHAR(191) NOT NULL,
  MODIFY `productSlug` VARCHAR(191) NOT NULL,
  MODIFY `unitPrice` INTEGER NOT NULL,
  MODIFY `snapshotSource`
    ENUM('CHECKOUT', 'BACKFILL_DERIVED', 'BACKFILL_ESTIMATE') NOT NULL;

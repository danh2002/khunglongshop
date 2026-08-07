CREATE TABLE `OrderSheetSyncState` (
  `orderId` VARCHAR(191) NOT NULL,
  `revision` INTEGER NOT NULL DEFAULT 1,
  `syncedRevision` INTEGER NOT NULL DEFAULT 0,
  `sheetRevision` INTEGER NOT NULL DEFAULT 0,
  `attempts` INTEGER NOT NULL DEFAULT 0,
  `nextAttemptAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `lastSyncedAt` DATETIME(3) NULL,
  `lastErrorCode` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,

  PRIMARY KEY (`orderId`),
  INDEX `OrderSheetSyncState_syncedRevision_nextAttemptAt_idx` (`syncedRevision`, `nextAttemptAt`),
  INDEX `OrderSheetSyncState_nextAttemptAt_idx` (`nextAttemptAt`),
  CONSTRAINT `OrderSheetSyncState_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Customer_order`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OrderSheetSyncEvent` (
  `eventId` VARCHAR(80) NOT NULL,
  `orderId` VARCHAR(191) NOT NULL,
  `sheetRevision` INTEGER NOT NULL,
  `outcome` VARCHAR(40) NOT NULL,
  `errorCode` VARCHAR(80) NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  PRIMARY KEY (`eventId`),
  INDEX `OrderSheetSyncEvent_orderId_sheetRevision_idx` (`orderId`, `sheetRevision`),
  INDEX `OrderSheetSyncEvent_createdAt_idx` (`createdAt`),
  CONSTRAINT `OrderSheetSyncEvent_orderId_fkey`
    FOREIGN KEY (`orderId`) REFERENCES `Customer_order`(`id`)
    ON DELETE CASCADE ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

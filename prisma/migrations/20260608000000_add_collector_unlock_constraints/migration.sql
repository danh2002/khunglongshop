-- Add indexes needed by the collector unlock flow.
-- Before applying in production, verify there are no duplicate collector slots:
-- SELECT setId, setSlotNumber, COUNT(*) FROM Product WHERE setId IS NOT NULL AND setSlotNumber IS NOT NULL GROUP BY setId, setSlotNumber HAVING COUNT(*) > 1;

CREATE UNIQUE INDEX `Product_setId_setSlotNumber_key` ON `Product`(`setId`, `setSlotNumber`);
CREATE INDEX `Product_isCollector_idx` ON `Product`(`isCollector`);
CREATE INDEX `RedemptionCode_userId_idx` ON `RedemptionCode`(`userId`);
CREATE INDEX `RedemptionCode_productId_idx` ON `RedemptionCode`(`productId`);
CREATE INDEX `RedemptionCode_userId_isUsed_idx` ON `RedemptionCode`(`userId`, `isUsed`);
CREATE UNIQUE INDEX `SetReward_userId_setId_key` ON `SetReward`(`userId`, `setId`);

-- AlterTable
ALTER TABLE `blindboxallocation` ADD COLUMN `rarityTier` ENUM('COMMON', 'RARE', 'EPIC', 'LEGENDARY') NOT NULL;

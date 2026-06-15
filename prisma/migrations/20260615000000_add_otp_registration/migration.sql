CREATE TABLE `OtpChallenge` (
  `id` VARCHAR(191) NOT NULL,
  `phone` VARCHAR(191) NOT NULL,
  `otpHash` VARCHAR(191) NOT NULL,
  `status` ENUM('PENDING','VERIFIED','CONSUMED','EXPIRED','LOCKED') NOT NULL DEFAULT 'PENDING',
  `attempts` INT NOT NULL DEFAULT 0,
  `resendCount` INT NOT NULL DEFAULT 0,
  `tokenHash` VARCHAR(191) NULL,
  `tokenExpiry` DATETIME(3) NULL,
  `expiresAt` DATETIME(3) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  INDEX `OtpChallenge_phone_status_idx`(`phone`, `status`),
  INDEX `OtpChallenge_status_updatedAt_idx`(`status`, `updatedAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OtpRateLimitEvent` (
  `id` VARCHAR(191) NOT NULL,
  `key` VARCHAR(191) NOT NULL,
  `status` ENUM('RESERVED','SENT','FAILED','FAILED_STALE') NOT NULL DEFAULT 'RESERVED',
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OtpRateLimitEvent_key_status_createdAt_idx`(`key`, `status`, `createdAt`),
  INDEX `OtpRateLimitEvent_createdAt_idx`(`createdAt`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `OtpAuditLog` (
  `id` VARCHAR(191) NOT NULL,
  `phoneMasked` VARCHAR(191) NOT NULL,
  `event` VARCHAR(191) NOT NULL,
  `ip` VARCHAR(191) NOT NULL,
  `challengeId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`id`),
  INDEX `OtpAuditLog_createdAt_idx`(`createdAt`),
  INDEX `OtpAuditLog_challengeId_idx`(`challengeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

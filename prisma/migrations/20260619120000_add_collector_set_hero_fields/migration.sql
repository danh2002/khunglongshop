ALTER TABLE `CollectorSet`
  ADD COLUMN `heroImage` VARCHAR(500) NULL,
  ADD COLUMN `heroBadge` VARCHAR(80) NULL,
  ADD COLUMN `heroTitle` VARCHAR(180) NULL,
  ADD COLUMN `heroSubtitle` VARCHAR(300) NULL,
  ADD COLUMN `heroPrimaryCtaLabel` VARCHAR(80) NULL,
  ADD COLUMN `heroPrimaryCtaUrl` VARCHAR(500) NULL,
  ADD COLUMN `heroSecondaryCtaLabel` VARCHAR(80) NULL,
  ADD COLUMN `heroSecondaryCtaUrl` VARCHAR(500) NULL,
  ADD COLUMN `showHero` BOOLEAN NOT NULL DEFAULT true;

UPDATE `CollectorSet`
SET
  `heroImage` = '/images/homepage-slider/1781849906469-46801996-ChatGPT-Image-13_18_17-19-thg-6-2026.png',
  `heroBadge` = 'BST RICON',
  `heroTitle` = 'BỘ SƯU TẬP MÓC KHOÁ RICÒN',
  `heroSubtitle` = 'Bộ Sưu Tập Móc Khoá Ricon',
  `heroPrimaryCtaLabel` = 'MUA NGAY',
  `heroPrimaryCtaUrl` = '/product/vanie-blind-box'
WHERE `slug` = 'ricon' OR `name` = 'Ricon';

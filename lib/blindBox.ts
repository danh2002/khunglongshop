import { createHash, randomInt } from "crypto";
import type { RarityTier } from "@prisma/client";

export const MIN_DRAW_WEIGHT = 1;
export const MAX_DRAW_WEIGHT = 1_000_000;
export const MAX_POOL_WEIGHT = 10_000_000;
export const BLIND_BOX_SLOT_COUNT = 10;

export type BlindBoxPoolInput = {
  productId: string;
  slotNumber: number;
  drawWeight: number;
  rarityTier: RarityTier;
};

export type BlindBoxPoolValidation = {
  valid: boolean;
  totalWeight: number;
  errors: string[];
};

export function validateBlindBoxPool(
  entries: BlindBoxPoolInput[]
): BlindBoxPoolValidation {
  const errors: string[] = [];
  const productIds = new Set<string>();
  const slots = new Set<number>();
  let totalWeight = 0;

  if (entries.length !== BLIND_BOX_SLOT_COUNT) {
    errors.push(`Pool phải có đúng ${BLIND_BOX_SLOT_COUNT} mẫu.`);
  }

  for (const entry of entries) {
    if (productIds.has(entry.productId)) {
      errors.push(`Sản phẩm ${entry.productId} bị trùng.`);
    }
    productIds.add(entry.productId);

    if (slots.has(entry.slotNumber)) {
      errors.push(`Slot ${entry.slotNumber} bị trùng.`);
    }
    slots.add(entry.slotNumber);

    if (
      !Number.isInteger(entry.drawWeight) ||
      entry.drawWeight < MIN_DRAW_WEIGHT ||
      entry.drawWeight > MAX_DRAW_WEIGHT
    ) {
      errors.push(
        `Trọng số slot ${entry.slotNumber} phải từ ${MIN_DRAW_WEIGHT} đến ${MAX_DRAW_WEIGHT}.`
      );
    }

    totalWeight += entry.drawWeight;
  }

  for (let slot = 1; slot <= BLIND_BOX_SLOT_COUNT; slot += 1) {
    if (!slots.has(slot)) errors.push(`Thiếu slot ${slot}.`);
  }

  if (totalWeight > MAX_POOL_WEIGHT) {
    errors.push(`Tổng trọng số không được vượt quá ${MAX_POOL_WEIGHT}.`);
  }

  const first = entries.find((entry) => entry.slotNumber === 1);
  const last = entries.find((entry) => entry.slotNumber === BLIND_BOX_SLOT_COUNT);
  if (first && last && last.drawWeight >= first.drawWeight) {
    errors.push("Vanie 10 phải hiếm hơn Vanie 1.");
  }

  return { valid: errors.length === 0, totalWeight, errors };
}

export function selectWeightedEntry<T extends { drawWeight: number }>(
  entries: T[],
  randomValue?: number
): T {
  const totalWeight = entries.reduce((sum, entry) => sum + entry.drawWeight, 0);

  if (entries.length === 0 || totalWeight <= 0 || totalWeight > MAX_POOL_WEIGHT) {
    throw new Error("INVALID_POOL_WEIGHT");
  }

  const draw = randomValue ?? randomInt(0, totalWeight);
  if (!Number.isInteger(draw) || draw < 0 || draw >= totalWeight) {
    throw new Error("INVALID_RANDOM_VALUE");
  }

  let upperBound = 0;
  for (const entry of entries) {
    upperBound += entry.drawWeight;
    if (draw < upperBound) return entry;
  }

  throw new Error("WEIGHTED_DRAW_FAILED");
}

export function hashCheckoutPayload(payload: unknown) {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
}


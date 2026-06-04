import { randomBytes } from "crypto";

export function generateRedemptionCode(): string {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `DKL-${part()}-${part()}-${part()}`;
}

export function generateSetRewardCode(): string {
  const part = () => randomBytes(2).toString("hex").toUpperCase();
  return `DKLS-${part()}-${part()}`;
}

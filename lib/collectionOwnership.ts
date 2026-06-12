type RedemptionLike = {
  productId: string;
  status: string;
  usedAt: Date | null;
  createdAt: Date;
  code: string;
};

export type ProductOwnership<T extends RedemptionLike> = {
  ownedCount: number;
  firstRedeemedAt: Date;
  firstCode: T;
};

export function summarizeProductOwnership<T extends RedemptionLike>(codes: T[]) {
  const ownership = new Map<string, ProductOwnership<T>>();

  for (const code of codes) {
    if (code.status !== "REDEEMED") continue;
    const current = ownership.get(code.productId);
    const redeemedAt = code.usedAt ?? code.createdAt;
    const isEarlier = !current || redeemedAt < current.firstRedeemedAt;
    ownership.set(code.productId, {
      ownedCount: (current?.ownedCount ?? 0) + 1,
      firstRedeemedAt: isEarlier ? redeemedAt : current.firstRedeemedAt,
      firstCode: isEarlier ? code : current.firstCode,
    });
  }

  return ownership;
}

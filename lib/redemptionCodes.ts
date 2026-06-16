import { Prisma } from "@prisma/client";
import { generateRedemptionCode } from "@/lib/codes";
import prisma from "@/utils/db";

type PrismaLike = typeof prisma | Prisma.TransactionClient;

export class RedemptionCodeGenerationError extends Error {
  constructor(message = "Unable to generate a unique redemption code") {
    super(message);
    this.name = "RedemptionCodeGenerationError";
  }
}

export async function createUniqueRedemptionCodeValue(
  client: PrismaLike = prisma,
  maxAttempts = 10,
  generator: () => string = generateRedemptionCode
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const code = generator();
    const existing = await client.redemptionCode.findUnique({ where: { code } });

    if (!existing) {
      return code;
    }
  }

  throw new RedemptionCodeGenerationError();
}

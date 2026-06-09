import prisma from "@/utils/db";
import type { Prisma } from "@prisma/client";

export class RollbackIntegrationTest extends Error {
  constructor() {
    super("ROLLBACK_INTEGRATION_TEST");
  }
}

export async function withRollback<T>(
  testBody: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Integration tests must not run with NODE_ENV=production");
  }

  let result: T | undefined;

  try {
    await prisma.$transaction(async (tx) => {
      result = await testBody(tx);
      throw new RollbackIntegrationTest();
    });
  } catch (error) {
    if (!(error instanceof RollbackIntegrationTest)) {
      throw error;
    }
  }

  return result as T;
}

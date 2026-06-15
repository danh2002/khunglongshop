import { Prisma } from "@prisma/client";
import prisma from "@/utils/db";

const SERIALIZABLE_RETRY_LIMIT = 3;

export class AdminUserMutationError extends Error {
  constructor(
    public readonly code:
      | "USER_NOT_FOUND"
      | "EMAIL_ALREADY_EXISTS"
      | "SELF_ACCESS_CHANGE_FORBIDDEN"
      | "LAST_ADMIN_FORBIDDEN"
      | "USER_HAS_DEPENDENCIES"
      | "USER_HAS_AUDIT_HISTORY",
    public readonly details?: Record<string, unknown>
  ) {
    super(code);
    this.name = "AdminUserMutationError";
  }
}

function isRetryableTransactionError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

export async function runSerializableAdminUserMutation<T>(
  mutation: (transaction: Prisma.TransactionClient) => Promise<T>
) {
  for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(mutation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (
        !isRetryableTransactionError(error) ||
        attempt === SERIALIZABLE_RETRY_LIMIT
      ) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry limit exhausted.");
}

import { Prisma } from "@prisma/client";
import prisma from "@/utils/db";

const USER_MUTATION_RETRY_LIMIT = 3;
const USER_MUTATION_ISOLATION_LEVEL = Prisma.TransactionIsolationLevel.RepeatableRead;

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
  for (let attempt = 1; attempt <= USER_MUTATION_RETRY_LIMIT; attempt += 1) {
    try {
      return await prisma.$transaction(mutation, {
        isolationLevel: USER_MUTATION_ISOLATION_LEVEL,
      });
    } catch (error) {
      if (
        !isRetryableTransactionError(error) ||
        attempt === USER_MUTATION_RETRY_LIMIT
      ) {
        throw error;
      }
    }
  }

  throw new Error("Admin user mutation retry limit exhausted.");
}

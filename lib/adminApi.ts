export type AdminApiErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "VALIDATION_ERROR"
  | "USER_NOT_FOUND"
  | "EMAIL_ALREADY_EXISTS"
  | "SELF_DELETE_FORBIDDEN"
  | "SELF_ACCESS_CHANGE_FORBIDDEN"
  | "LAST_ADMIN_FORBIDDEN"
  | "USER_HAS_DEPENDENCIES"
  | "USER_HAS_AUDIT_HISTORY"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_ERROR";

export type AdminApiError = {
  error: {
    code: AdminApiErrorCode;
    message: string;
    fieldErrors?: Record<string, string[]>;
    details?: Record<string, unknown>;
  };
};

export type Pagination = {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  items: T[];
  pagination: Pagination;
};

export function parseAdminPagination(searchParams: URLSearchParams) {
  const page = Math.max(Number(searchParams.get("page") || 1), 1);
  const rawLimit = Number(searchParams.get("limit") || 20);
  const limit = Math.min(Math.max(Number.isFinite(rawLimit) ? rawLimit : 20, 1), 100);
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function createPagination(page: number, limit: number, totalItems: number): Pagination {
  return {
    page,
    limit,
    totalItems,
    totalPages: Math.max(Math.ceil(totalItems / limit), 1),
  };
}

export function normalizeAdminSearch(value: string | null) {
  return value?.trim().toLowerCase() || "";
}

export function isRole(value: unknown): value is "admin" | "user" {
  return value === "admin" || value === "user";
}

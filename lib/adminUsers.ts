export type UserRole = "admin" | "user";

export type AdminUserListItem = {
  id: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  deactivatedAt: string | Date | null;
  orderCount: number;
  wishlistCount: number;
};

export type UserDependencyCounts = {
  orderCount: number;
  wishlistCount: number;
  notificationCount: number;
  bulkUploadBatchCount: number;
  redemptionCodeCount: number;
  setRewardCount: number;
  adminAuditLogCount: number;
  blindBoxAllocationCount: number;
};

export type AdminUserDetail = AdminUserListItem & {
  dependencyCounts: UserDependencyCounts;
};

import { NotificationPriority, NotificationType } from "@prisma/client";
import { z } from "zod";

export const notificationFiltersSchema = z.object({
  type: z.nativeEnum(NotificationType).optional(),
  isRead: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  sortBy: z.enum(["createdAt", "priority"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export const notificationCreateSchema = z.object({
  userId: z.string().min(1),
  title: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(5000),
  type: z.nativeEnum(NotificationType),
  priority: z.nativeEnum(NotificationPriority).default(NotificationPriority.NORMAL),
  metadata: z.unknown().optional(),
});

export const notificationUpdateSchema = z.object({
  isRead: z.boolean(),
});

export const notificationBulkSchema = z.object({
  notificationIds: z.array(z.string().min(1)).min(1).max(100),
});

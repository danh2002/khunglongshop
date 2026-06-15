"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AdminActionLink,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTh,
  adminInputClass,
  adminSecondaryButtonClass,
} from "@/components/admin/AdminUi";
import type { AdminUserListItem } from "@/lib/adminUsers";

type UsersResponse = {
  items: AdminUserListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export default function DashboardUsers() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [search, setSearch] = useState(searchParams.get("search") ?? "");
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const page = Math.max(Number(searchParams.get("page") ?? "1"), 1);
  const role = searchParams.get("role") ?? "";
  const status = searchParams.get("status") ?? "";

  const apiQuery = useMemo(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(page));
    params.set("limit", "20");
    return params.toString();
  }, [page, searchParams]);

  const updateQuery = useCallback(
    (values: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(values).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });
      router.replace(`/admin/users?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const currentSearch = searchParams.get("search") ?? "";
      if (search.trim() !== currentSearch) {
        updateQuery({ search: search.trim(), page: "1" });
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [search, searchParams, updateQuery]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    setError("");

    fetch(`/api/admin/users?${apiQuery}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(
            payload?.error?.message || "Không thể tải danh sách người dùng."
          );
        }
        return payload as UsersResponse;
      })
      .then((payload) => {
        if (!active) return;
        setUsers(payload.items);
        setTotalPages(payload.pagination.totalPages);
      })
      .catch((loadError: unknown) => {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Không thể tải danh sách người dùng."
          );
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [apiQuery, reloadKey]);

  return (
    <AdminPage className="bg-[#070707]">
      <AdminPageHeader
        title="Người dùng"
        description="Tìm kiếm, phân quyền và quản lý trạng thái tài khoản."
        action={
          <AdminActionLink href="/admin/users/new">
            Thêm người dùng
          </AdminActionLink>
        }
      />

      <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,360px)_180px_190px]">
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Tìm theo email..."
          className={adminInputClass}
        />
        <select
          value={role}
          onChange={(event) =>
            updateQuery({ role: event.target.value, page: "1" })
          }
          className={adminInputClass}
        >
          <option value="">Tất cả vai trò</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
        <select
          value={status}
          onChange={(event) =>
            updateQuery({ status: event.target.value, page: "1" })
          }
          className={adminInputClass}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Đã vô hiệu hóa</option>
        </select>
      </div>

      {error ? (
        <AdminEmptyState>
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            className={`${adminSecondaryButtonClass} mt-4`}
          >
            Thử lại
          </button>
        </AdminEmptyState>
      ) : isLoading ? (
        <AdminEmptyState>Đang tải danh sách người dùng...</AdminEmptyState>
      ) : users.length === 0 ? (
        <AdminEmptyState>Không tìm thấy người dùng phù hợp.</AdminEmptyState>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Email</AdminTh>
              <AdminTh>Vai trò</AdminTh>
              <AdminTh>Trạng thái</AdminTh>
              <AdminTh>Đơn hàng</AdminTh>
              <AdminTh>Wishlist</AdminTh>
              <AdminTh>Thao tác</AdminTh>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <AdminTd className="max-w-[360px] break-all font-bold">
                  {user.email}
                </AdminTd>
                <AdminTd>
                  <AdminStatusBadge
                    tone={user.role === "admin" ? "warning" : "neutral"}
                  >
                    {user.role}
                  </AdminStatusBadge>
                </AdminTd>
                <AdminTd>
                  <AdminStatusBadge
                    tone={user.isActive ? "success" : "danger"}
                  >
                    {user.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                  </AdminStatusBadge>
                </AdminTd>
                <AdminTd>{user.orderCount}</AdminTd>
                <AdminTd>{user.wishlistCount}</AdminTd>
                <AdminTd>
                  <Link
                    href={`/admin/users/${user.id}`}
                    className="font-black uppercase text-[#e85d00]"
                  >
                    Chi tiết
                  </Link>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}

      <div className="mt-5 flex items-center justify-end gap-3">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => updateQuery({ page: String(page - 1) })}
          className={adminSecondaryButtonClass}
        >
          Trước
        </button>
        <span className="text-sm text-white/60">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => updateQuery({ page: String(page + 1) })}
          className={adminSecondaryButtonClass}
        >
          Sau
        </button>
      </div>
    </AdminPage>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type AdminUserListItem = {
  id: string;
  email: string;
  role: "admin" | "user";
  orderCount: number;
  wishlistCount: number;
};

type UsersResponse = {
  items: AdminUserListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

const roleOptions = [
  { value: "", label: "Tất cả vai trò" },
  { value: "admin", label: "Admin" },
  { value: "user", label: "User" },
];

export default function DashboardUsers() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams({
      page: String(page),
      limit: "20",
    });

    if (search.trim()) params.set("search", search.trim());
    if (role) params.set("role", role);

    return params.toString();
  }, [page, role, search]);

  useEffect(() => {
    let mounted = true;

    async function loadUsers() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/admin/users?${query}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to load users");
        }

        const payload = (await response.json()) as UsersResponse;

        if (mounted) {
          setUsers(payload.items);
          setTotalPages(payload.pagination.totalPages);
        }
      } catch (error) {
        if (mounted) {
          toast.error("Không thể tải danh sách người dùng");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadUsers();

    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex max-w-screen-2xl max-xl:flex-col">
        <section className="w-full px-5 py-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#e85d00]">CMS</p>
              <h1 className="mt-2 text-3xl font-black uppercase italic">Người dùng</h1>
            </div>
            <Link
              href="/admin/users/new"
              className="inline-flex min-h-12 items-center border border-[#e85d00] bg-[#e85d00] px-5 text-sm font-black uppercase text-white hover:bg-[#ff7417]"
            >
              Thêm người dùng
            </Link>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,360px)_180px_auto]">
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm theo email..."
              className="min-h-12 border border-[#e85d00]/40 bg-white/5 px-4 text-white outline-none focus:border-[#e85d00]"
            />
            <select
              value={role}
              onChange={(event) => {
                setPage(1);
                setRole(event.target.value);
              }}
              className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="overflow-auto border border-[#e85d00]/25 bg-white/[0.03]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#e85d00] text-xs uppercase text-white">
                <tr>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Vai trò</th>
                  <th className="px-4 py-3">Đơn hàng</th>
                  <th className="px-4 py-3">Wishlist</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-white/60" colSpan={5}>
                      Đang tải...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td className="px-4 py-8 text-center text-white/60" colSpan={5}>
                      Không tìm thấy dữ liệu phù hợp
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="border-t border-white/10">
                      <td className="max-w-[360px] px-4 py-4 font-bold text-white">{user.email}</td>
                      <td className="px-4 py-4 uppercase text-[#e85d00]">{user.role}</td>
                      <td className="px-4 py-4">{user.orderCount}</td>
                      <td className="px-4 py-4">{user.wishlistCount}</td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/admin/users/${user.id}`} className="font-black uppercase text-[#e85d00]">
                          Chi tiết
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="min-h-10 border border-white/20 px-4 font-bold uppercase text-white disabled:opacity-40"
            >
              Trước
            </button>
            <span className="text-sm text-white/70">
              Trang {page}/{totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              className="min-h-10 border border-white/20 px-4 font-bold uppercase text-white disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

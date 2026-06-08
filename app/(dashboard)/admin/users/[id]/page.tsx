"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type Role = "admin" | "user";

type AdminUserDetail = {
  id: string;
  email: string;
  role: Role;
  orderCount: number;
  wishlistCount: number;
  dependencyCounts: Record<string, number>;
};

interface DashboardUserDetailsProps {
  params: Promise<{ id: string }>;
}

export default function DashboardSingleUserPage({ params }: DashboardUserDetailsProps) {
  const { id } = use(params);
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const dependencySummary = useMemo(() => {
    if (!user?.dependencyCounts) return [];
    return Object.entries(user.dependencyCounts).filter(([, count]) => count > 0);
  }, [user]);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/admin/users/${id}`, { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Failed to load user");
        }

        const payload = (await response.json()) as AdminUserDetail;

        if (mounted) {
          setUser(payload);
          setEmail(payload.email);
          setRole(payload.role);
        }
      } catch (error) {
        if (mounted) {
          toast.error("Không thể tải người dùng");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, [id]);

  async function updateUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password && password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          role,
          ...(password ? { password } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(payload?.error?.message || "Không thể cập nhật người dùng");
        return;
      }

      toast.success("Đã cập nhật người dùng");
      setPassword("");
      setConfirmPassword("");
      setUser((current) => (current ? { ...current, email: payload.email, role: payload.role } : current));
    } catch (error) {
      toast.error("Không thể cập nhật người dùng");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteUser() {
    if (!user) return;

    const confirmed = window.confirm(`Xóa người dùng ${user.email}? Hành động này không thể hoàn tác.`);
    if (!confirmed) return;

    const response = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });

    if (response.status === 204) {
      toast.success("Đã xóa người dùng");
      router.push("/admin/users");
      return;
    }

    const payload = await response.json().catch(() => null);
    toast.error(payload?.error?.message || "Không thể xóa người dùng");
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex max-w-screen-2xl max-xl:flex-col">
        <section className="w-full px-5 py-6">
          <div className="mb-6">
            <Link href="/admin/users" className="text-sm font-black uppercase text-[#e85d00]">
              Quay lại danh sách
            </Link>
            <h1 className="mt-3 text-3xl font-black uppercase italic">Chi tiết người dùng</h1>
          </div>

          {isLoading ? (
            <div className="border border-[#e85d00]/25 bg-white/[0.03] p-6 text-white/60">Đang tải...</div>
          ) : !user ? (
            <div className="border border-[#e85d00]/25 bg-white/[0.03] p-6 text-white/60">
              Không tìm thấy người dùng
            </div>
          ) : (
            <div className="grid gap-5 lg:grid-cols-[minmax(0,580px)_minmax(280px,360px)]">
              <form onSubmit={updateUser} className="grid gap-5 border border-[#e85d00]/25 bg-white/[0.03] p-5">
                <label className="grid gap-2 text-sm font-black uppercase text-white/70">
                  Email
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
                  />
                </label>

                <label className="grid gap-2 text-sm font-black uppercase text-white/70">
                  Vai trò
                  <select
                    value={role}
                    onChange={(event) => setRole(event.target.value as Role)}
                    className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
                  >
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </label>

                <div className="border-t border-white/10 pt-5">
                  <p className="mb-3 text-sm font-black uppercase text-[#e85d00]">Đặt lại mật khẩu</p>
                  <div className="grid gap-4">
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Mật khẩu mới (để trống nếu không đổi)"
                      className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
                    />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Xác nhận mật khẩu mới"
                      className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="min-h-12 bg-[#e85d00] px-5 font-black uppercase text-white hover:bg-[#ff7417] disabled:opacity-50"
                  >
                    {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
                  </button>
                  <button
                    type="button"
                    onClick={deleteUser}
                    className="min-h-12 border border-red-500 px-5 font-black uppercase text-red-300 hover:bg-red-500 hover:text-white"
                  >
                    Xóa
                  </button>
                </div>
              </form>

              <aside className="border border-[#e85d00]/25 bg-white/[0.03] p-5">
                <h2 className="text-lg font-black uppercase italic">Dữ liệu liên quan</h2>
                <div className="mt-4 grid gap-3 text-sm text-white/70">
                  <p>Đơn hàng: {user.orderCount}</p>
                  <p>Wishlist: {user.wishlistCount}</p>
                  {dependencySummary.length > 0 ? (
                    <div className="border-t border-white/10 pt-3">
                      <p className="font-bold text-[#e85d00]">Không thể xóa khi còn dữ liệu:</p>
                      <ul className="mt-2 grid gap-1">
                        {dependencySummary.map(([key, count]) => (
                          <li key={key}>
                            {key}: {count}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p className="text-green-300">Người dùng đủ điều kiện xóa nếu không phải admin đang đăng nhập.</p>
                  )}
                </div>
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import toast from "react-hot-toast";

type Role = "admin" | "user";

export default function DashboardCreateNewUser() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [isSaving, setIsSaving] = useState(false);

  async function submitUser(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(payload?.error?.message || "Không thể tạo người dùng");
        return;
      }

      toast.success("Đã tạo người dùng");
      router.push("/admin/users");
    } catch (error) {
      toast.error("Không thể tạo người dùng");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex max-w-screen-2xl max-xl:flex-col">
        <section className="w-full px-5 py-6">
          <div className="mb-6">
            <Link href="/admin/users" className="text-sm font-black uppercase text-[#e85d00]">
              Quay lại danh sách
            </Link>
            <h1 className="mt-3 text-3xl font-black uppercase italic">Thêm người dùng</h1>
          </div>

          <form onSubmit={submitUser} className="grid max-w-xl gap-5 border border-[#e85d00]/25 bg-white/[0.03] p-5">
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
              Mật khẩu
              <input
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
              />
            </label>

            <label className="grid gap-2 text-sm font-black uppercase text-white/70">
              Xác nhận mật khẩu
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
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

            <button
              type="submit"
              disabled={isSaving}
              className="min-h-12 bg-[#e85d00] px-5 font-black uppercase text-white hover:bg-[#ff7417] disabled:opacity-50"
            >
              {isSaving ? "Đang lưu..." : "Tạo người dùng"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}

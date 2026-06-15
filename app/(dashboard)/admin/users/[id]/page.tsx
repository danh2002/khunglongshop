"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
  AdminActionLink,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
} from "@/components/admin/AdminUi";
import { UserDeleteActions } from "@/components/admin/UserDeleteActions";
import { UserForm } from "@/components/admin/UserForm";
import type { AdminUserDetail } from "@/lib/adminUsers";

type DashboardUserDetailsProps = {
  params: Promise<{ id: string }>;
};

export default function DashboardSingleUserPage({
  params,
}: DashboardUserDetailsProps) {
  const { id } = use(params);
  const { data: session } = useSession();
  const router = useRouter();
  const [user, setUser] = useState<AdminUserDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const loadUser = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        cache: "no-store",
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error?.message || "Không thể tải người dùng."
        );
      }

      setUser(payload as AdminUserDetail);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải người dùng."
      );
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadUser();
  }, [loadUser]);

  return (
    <AdminPage className="bg-[#070707]">
      <AdminPageHeader
        title="Chi tiết người dùng"
        description="Cập nhật quyền, trạng thái và thông tin đăng nhập."
        action={<AdminActionLink href="/admin/users">Quay lại</AdminActionLink>}
      />

      {isLoading ? (
        <AdminEmptyState>Đang tải người dùng...</AdminEmptyState>
      ) : error || !user ? (
        <AdminEmptyState>
          <p>{error || "Không tìm thấy người dùng."}</p>
          <button
            type="button"
            onClick={() => void loadUser()}
            className="mt-4 min-h-10 border border-white/20 px-4 font-bold uppercase text-white"
          >
            Thử lại
          </button>
        </AdminEmptyState>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,680px)_minmax(320px,1fr)]">
          <UserForm
            key={`${user.id}:${user.email}:${user.role}:${user.isActive}`}
            mode="edit"
            initialEmail={user.email}
            initialRole={user.role}
            initialIsActive={user.isActive}
            onSubmit={async (values) => {
              const response = await fetch(`/api/admin/users/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  email: values.email,
                  role: values.role,
                  isActive: values.isActive,
                  ...(values.password ? { password: values.password } : {}),
                }),
              });
              const payload = await response.json().catch(() => null);

              if (!response.ok) {
                const updateError = new Error(
                  payload?.error?.message || "Không thể cập nhật người dùng."
                ) as Error & { fieldErrors?: Record<string, string[]> };
                updateError.fieldErrors = payload?.error?.fieldErrors;
                throw updateError;
              }

              toast.success("Đã cập nhật người dùng.");
              setUser((current) =>
                current ? { ...current, ...payload } : current
              );
            }}
          />

          <div className="grid content-start gap-5">
            <UserSummary user={user} />
            <UserDeleteActions
              userId={user.id}
              email={user.email}
              isActive={user.isActive}
              isCurrentUser={session?.user.id === user.id}
              onDeleted={() => router.push("/admin/users")}
              onStatusChanged={(isActive) =>
                setUser((current) =>
                  current
                    ? {
                        ...current,
                        isActive,
                        deactivatedAt: isActive
                          ? null
                          : new Date().toISOString(),
                      }
                    : current
                )
              }
            />
          </div>
        </div>
      )}
    </AdminPage>
  );
}

function UserSummary({ user }: { user: AdminUserDetail }) {
  const dependencies = Object.entries(user.dependencyCounts).filter(
    ([, count]) => count > 0
  );

  return (
    <aside className="border border-white/10 bg-[#0f0f0f] p-5">
      <div className="flex flex-wrap items-center gap-2">
        <AdminStatusBadge
          tone={user.role === "admin" ? "warning" : "neutral"}
        >
          {user.role}
        </AdminStatusBadge>
        <AdminStatusBadge tone={user.isActive ? "success" : "danger"}>
          {user.isActive ? "Đang hoạt động" : "Đã vô hiệu hóa"}
        </AdminStatusBadge>
      </div>
      <h2 className="mt-5 text-lg font-black uppercase text-white">
        Dữ liệu liên quan
      </h2>
      {dependencies.length ? (
        <ul className="mt-3 grid gap-2 text-sm text-white/65">
          {dependencies.map(([key, count]) => (
            <li key={key} className="flex justify-between gap-4">
              <span>{key}</span>
              <strong className="text-white">{count}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-emerald-300">
          Tài khoản hiện không có dữ liệu phụ thuộc.
        </p>
      )}
    </aside>
  );
}

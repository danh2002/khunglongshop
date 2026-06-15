"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import {
  AdminActionLink,
  AdminPage,
  AdminPageHeader,
} from "@/components/admin/AdminUi";
import { UserForm } from "@/components/admin/UserForm";

export default function DashboardCreateNewUser() {
  const router = useRouter();

  return (
    <AdminPage className="bg-[#070707]">
      <AdminPageHeader
        title="Thêm người dùng"
        description="Tạo tài khoản mới và phân quyền ban đầu."
        action={<AdminActionLink href="/admin/users">Quay lại</AdminActionLink>}
      />
      <div className="max-w-2xl">
        <UserForm
          mode="create"
          onSubmit={async (values) => {
            const response = await fetch("/api/admin/users", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email: values.email,
                password: values.password,
                role: values.role,
              }),
            });
            const payload = await response.json().catch(() => null);

            if (!response.ok) {
              const error = new Error(
                payload?.error?.message || "Không thể tạo người dùng."
              ) as Error & { fieldErrors?: Record<string, string[]> };
              error.fieldErrors = payload?.error?.fieldErrors;
              throw error;
            }

            toast.success("Đã tạo người dùng.");
            router.push(`/admin/users/${payload.id}`);
          }}
        />
      </div>
    </AdminPage>
  );
}

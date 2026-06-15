"use client";

import { FormEvent, useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass } from "@/components/admin/AdminUi";
import type { UserRole } from "@/lib/adminUsers";

type UserFormValues = {
  email: string;
  password: string;
  role: UserRole;
  isActive?: boolean;
};

type UserFormProps = {
  mode: "create" | "edit";
  initialEmail?: string;
  initialRole?: UserRole;
  initialIsActive?: boolean;
  onSubmit: (values: UserFormValues) => Promise<void>;
};

export function UserForm({
  mode,
  initialEmail = "",
  initialRole = "user",
  initialIsActive = true,
  onSubmit,
}: UserFormProps) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>(initialRole);
  const [isActive, setIsActive] = useState(initialIsActive);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldErrors({});

    if (password !== confirmPassword) {
      setFieldErrors({ confirmPassword: ["Mật khẩu xác nhận không khớp."] });
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit({
        email,
        password,
        role,
        ...(mode === "edit" ? { isActive } : {}),
      });
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      const apiError = error as Error & {
        fieldErrors?: Record<string, string[]>;
      };
      setFieldErrors(apiError.fieldErrors ?? {});
      toast.error(apiError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 border border-white/10 bg-[#0f0f0f] p-5"
    >
      <FormField label="Email" error={fieldErrors.email?.[0]}>
        <input
          className={adminInputClass}
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
      </FormField>

      <FormField label="Vai trò" error={fieldErrors.role?.[0]}>
        <select
          className={adminInputClass}
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
        >
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </FormField>

      {mode === "edit" ? (
        <FormField label="Trạng thái" error={fieldErrors.isActive?.[0]}>
          <select
            className={adminInputClass}
            value={isActive ? "active" : "inactive"}
            onChange={(event) => setIsActive(event.target.value === "active")}
          >
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã vô hiệu hóa</option>
          </select>
        </FormField>
      ) : null}

      <div className="border-t border-white/10 pt-5">
        <p className="mb-4 text-sm font-black uppercase text-[#e85d00]">
          {mode === "create" ? "Mật khẩu" : "Đặt lại mật khẩu"}
        </p>
        <div className="grid gap-4">
          <FormField label="Mật khẩu" error={fieldErrors.password?.[0]}>
            <input
              className={adminInputClass}
              type="password"
              required={mode === "create"}
              value={password}
              autoComplete="new-password"
              placeholder={
                mode === "edit" ? "Để trống nếu không thay đổi" : undefined
              }
              onChange={(event) => setPassword(event.target.value)}
            />
          </FormField>
          <FormField
            label="Xác nhận mật khẩu"
            error={fieldErrors.confirmPassword?.[0]}
          >
            <input
              className={adminInputClass}
              type="password"
              required={mode === "create" || Boolean(password)}
              value={confirmPassword}
              autoComplete="new-password"
              onChange={(event) => setConfirmPassword(event.target.value)}
            />
          </FormField>
          <p className="text-xs text-white/45">
            Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt.
          </p>
        </div>
      </div>

      {fieldErrors.root?.[0] ? (
        <p className="text-sm text-red-300">{fieldErrors.root[0]}</p>
      ) : null}

      <button
        type="submit"
        disabled={isSaving}
        className="min-h-11 bg-[#e85d00] px-5 font-black uppercase text-white transition hover:bg-[#ff7417] disabled:opacity-50"
      >
        {isSaving
          ? "Đang lưu..."
          : mode === "create"
            ? "Tạo người dùng"
            : "Lưu thay đổi"}
      </button>
    </form>
  );
}

function FormField({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-2 text-sm font-black uppercase text-white/70">
      {label}
      {children}
      {error ? (
        <span className="normal-case text-red-300">{error}</span>
      ) : null}
    </label>
  );
}

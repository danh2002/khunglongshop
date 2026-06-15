"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { UserDependencyCounts } from "@/lib/adminUsers";

type UserDeleteActionsProps = {
  userId: string;
  email: string;
  isActive: boolean;
  isCurrentUser: boolean;
  onDeleted: () => void;
  onStatusChanged: (isActive: boolean) => void;
};

export function UserDeleteActions({
  userId,
  email,
  isActive,
  isCurrentUser,
  onDeleted,
  onStatusChanged,
}: UserDeleteActionsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isWorking, setIsWorking] = useState(false);
  const [dependencyCounts, setDependencyCounts] =
    useState<UserDependencyCounts | null>(null);

  async function changeStatus(nextIsActive: boolean) {
    setIsWorking(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextIsActive }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          payload?.error?.message || "Không thể cập nhật trạng thái."
        );
      }

      toast.success(
        nextIsActive ? "Đã kích hoạt lại tài khoản." : "Đã vô hiệu hóa tài khoản."
      );
      onStatusChanged(nextIsActive);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể cập nhật trạng thái."
      );
    } finally {
      setIsWorking(false);
    }
  }

  async function deleteUser() {
    setIsWorking(true);
    setDependencyCounts(null);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
      });

      if (response.status === 204) {
        toast.success("Đã xóa người dùng.");
        onDeleted();
        return;
      }

      const payload = await response.json().catch(() => null);
      const counts = payload?.error?.details
        ?.dependencyCounts as UserDependencyCounts | undefined;
      if (counts) setDependencyCounts(counts);
      throw new Error(payload?.error?.message || "Không thể xóa người dùng.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Không thể xóa người dùng."
      );
    } finally {
      setIsWorking(false);
    }
  }

  return (
    <section className="border border-white/10 bg-[#0f0f0f] p-5">
      <h2 className="text-lg font-black uppercase text-white">
        Trạng thái và xóa
      </h2>
      <p className="mt-2 text-sm leading-6 text-white/55">
        Vô hiệu hóa giữ lại lịch sử nghiệp vụ. Xóa vĩnh viễn chỉ khả dụng khi
        tài khoản không có dữ liệu liên quan.
      </p>

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isWorking || isCurrentUser}
          onClick={() => changeStatus(!isActive)}
          className="min-h-10 border border-amber-500 px-4 text-sm font-black uppercase text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {isActive ? "Vô hiệu hóa" : "Kích hoạt lại"}
        </button>
        {!isCurrentUser ? (
          <button
            type="button"
            disabled={isWorking}
            onClick={() => setIsDialogOpen(true)}
            className="min-h-10 border border-red-500 px-4 text-sm font-black uppercase text-red-300 disabled:opacity-40"
          >
            Xóa vĩnh viễn
          </button>
        ) : null}
      </div>

      {isCurrentUser ? (
        <p className="mt-3 text-xs text-white/45">
          Không thể tự hạ quyền, vô hiệu hóa hoặc xóa tài khoản đang đăng nhập.
        </p>
      ) : null}

      {isDialogOpen ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 px-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setIsDialogOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-user-title"
            className="w-full max-w-lg border border-red-500/60 bg-[#0f0f0f] p-6 text-white shadow-2xl"
          >
            <h3 id="delete-user-title" className="text-xl font-black uppercase">
              Xóa người dùng?
            </h3>
            <p className="mt-3 break-all text-sm leading-6 text-white/65">
              Tài khoản <strong className="text-white">{email}</strong> sẽ bị
              xóa vĩnh viễn. Hành động này không thể hoàn tác.
            </p>

            {dependencyCounts ? (
              <DependencySummary counts={dependencyCounts} />
            ) : null}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                autoFocus
                disabled={isWorking}
                onClick={() => setIsDialogOpen(false)}
                className="min-h-10 border border-white/20 px-4 font-bold uppercase"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isWorking}
                onClick={deleteUser}
                className="min-h-10 bg-red-600 px-4 font-black uppercase disabled:opacity-50"
              >
                {isWorking ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function DependencySummary({ counts }: { counts: UserDependencyCounts }) {
  const visibleCounts = Object.entries(counts).filter(([, count]) => count > 0);

  return (
    <div className="mt-4 border border-amber-500/40 bg-amber-500/10 p-4">
      <p className="text-sm font-bold text-amber-200">
        Không thể xóa. Hãy vô hiệu hóa tài khoản để giữ lịch sử:
      </p>
      <ul className="mt-2 grid gap-1 text-sm text-white/70">
        {visibleCounts.map(([key, count]) => (
          <li key={key}>
            {key}: {count}
          </li>
        ))}
      </ul>
    </div>
  );
}

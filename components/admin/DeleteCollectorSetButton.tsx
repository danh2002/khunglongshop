"use client";

import { useRouter } from "next/navigation";

export default function DeleteCollectorSetButton({
  id,
  disabled,
}: {
  id: string;
  disabled: boolean;
}) {
  const router = useRouter();

  async function handleDelete() {
    if (!window.confirm("Xóa bộ sưu tập này?")) return;
    const response = await fetch(`/api/admin/collector-sets/${id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      alert(body?.error?.message ?? "Không thể xóa bộ sưu tập.");
      return;
    }
    router.push("/admin/collector-sets");
    router.refresh();
  }

  return disabled ? (
    <span className="text-xs text-white/40">Bộ có lịch sử, không thể xóa.</span>
  ) : (
    <button
      type="button"
      onClick={handleDelete}
      className="border border-red-600 px-4 py-2 text-sm font-black uppercase text-red-500 hover:bg-red-600 hover:text-white"
    >
      Xóa bộ sưu tập
    </button>
  );
}

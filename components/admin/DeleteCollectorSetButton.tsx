"use client";

import { useRouter } from "next/navigation";

export default function DeleteCollectorSetButton({
  id,
  disabled,
  setName,
}: {
  id: string;
  disabled: boolean;
  setName: string;
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

  async function handleForceDelete() {
    if (!window.confirm(`XÓA CƯỠNG BỨC bộ "${setName}"? Toàn bộ code, phần thưởng và dữ liệu liên quan sẽ bị xóa vĩnh viễn.`)) return;
    const response = await fetch(`/api/admin/collector-sets/${id}?force=true`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      alert(body?.error?.message ?? "Không thể xóa cưỡng bức.");
      return;
    }
    router.push("/admin/collector-sets");
    router.refresh();
  }

  return (
    <div className="flex gap-2">
      {!disabled ? (
        <button
          type="button"
          onClick={handleDelete}
          className="border border-red-600 px-4 py-2 text-sm font-black uppercase text-red-500 hover:bg-red-600 hover:text-white"
        >
          Xóa bộ sưu tập
        </button>
      ) : (
        <span className="text-xs text-white/40">Bộ có lịch sử, không thể xóa thường.</span>
      )}
      <button
        type="button"
        onClick={handleForceDelete}
        className="border border-red-800 bg-red-950 px-4 py-2 text-sm font-black uppercase text-red-400 hover:bg-red-700 hover:text-white"
      >
        Xóa cưỡng bức
      </button>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function DisableCodeButton({ id }: { id: string }) {
  const router = useRouter();
  async function disable() {
    if (!window.confirm("Vô hiệu hóa mã này?")) return;
    const response = await fetch(`/api/admin/redemption-codes/${id}/disable`, { method: "POST" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể vô hiệu hóa mã.");
      return;
    }
    toast.success("Đã vô hiệu hóa mã.");
    router.refresh();
  }
  return (
    <button className="font-bold text-red-300" onClick={disable} type="button">
      Vô hiệu hóa
    </button>
  );
}

"use client";

import type { OrderStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export default function OrderStatusForm({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const options = transitions[status];
  const [nextStatus, setNextStatus] = useState<OrderStatus | "">(options[0] ?? "");
  const [saving, setSaving] = useState(false);

  if (!options.length) return <p className="text-sm text-white/45">Trạng thái đã kết thúc.</p>;

  async function submit() {
    if (!nextStatus) return;
    if (
      (nextStatus === "CANCELLED" || nextStatus === "DELIVERED") &&
      !window.confirm(`Xác nhận chuyển đơn sang ${nextStatus}?`)
    ) {
      return;
    }
    setSaving(true);
    const response = await fetch(`/api/admin/orders/${orderId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể cập nhật trạng thái.");
      return;
    }
    toast.success("Đã cập nhật trạng thái đơn hàng.");
    router.refresh();
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        className={adminInputClass}
        value={nextStatus}
        onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <button className={adminSecondaryButtonClass} disabled={saving} onClick={submit} type="button">
        {saving ? "Đang lưu" : "Cập nhật"}
      </button>
    </div>
  );
}

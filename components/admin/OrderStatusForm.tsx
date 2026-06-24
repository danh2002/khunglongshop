"use client";

import type { OrderStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

const transitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
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
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  if (!options.length) return <p className="text-sm text-white/45">Trạng thái đã kết thúc.</p>;

  async function submit() {
    if (!nextStatus) return;
    if (nextStatus === "CANCELLED" && cancelReason.trim().length < 10) {
      toast.error("Lý do hủy phải có ít nhất 10 ký tự.");
      return;
    }
    if (
      (nextStatus === "CANCELLED" || nextStatus === "COMPLETED") &&
      !window.confirm(`Xác nhận chuyển đơn sang ${STATUS_LABEL[nextStatus]}?`)
    ) {
      return;
    }
    setSaving(true);
    const isCancellation = nextStatus === "CANCELLED";
    const response = await fetch(
      isCancellation
        ? `/api/admin/orders/${orderId}/cancel`
        : `/api/admin/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isCancellation
            ? { reason: cancelReason.trim() }
            : { status: nextStatus }
        ),
      }
    );
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
    <div className="grid gap-3">
      <div className="flex flex-wrap gap-3">
        <select
          className={adminInputClass}
          value={nextStatus}
          onChange={(event) => setNextStatus(event.target.value as OrderStatus)}
        >
          {options.map((option) => (
            <option key={option} value={option}>
              {STATUS_LABEL[option]}
            </option>
          ))}
        </select>
        <button className={adminSecondaryButtonClass} disabled={saving} onClick={submit} type="button">
          {saving ? "Đang lưu" : "Cập nhật"}
        </button>
      </div>
      {nextStatus === "CANCELLED" ? (
        <label className="grid gap-2 text-sm font-bold text-white">
          Lý do hủy *
          <textarea
            className={`${adminInputClass} min-h-24 py-3`}
            minLength={10}
            required
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Nhập lý do hủy đơn hàng (ít nhất 10 ký tự)"
          />
        </label>
      ) : null}
    </div>
  );
}

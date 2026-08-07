"use client";

import type { OrderStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import {
  canRestoreCancelledOrder,
  ORDER_STATUS_TRANSITIONS,
} from "@/lib/orderTransitions";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

const STATUS_OPTIONS: OrderStatus[] = [
  "PENDING_PAYMENT",
  "PROCESSING",
  "COMPLETED",
  "CANCELLED",
];

export default function OrderStatusForm({
  orderId,
  status,
}: {
  orderId: string;
  status: OrderStatus;
}) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = useState<OrderStatus>(status);
  const [cancelReason, setCancelReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (nextStatus === status) return;
    const isRestoration =
      canRestoreCancelledOrder(status) && nextStatus === "PENDING_PAYMENT";

    if (nextStatus === "CANCELLED" && cancelReason.trim().length < 10) {
      toast.error("Lý do huỷ phải có ít nhất 10 ký tự.");
      return;
    }
    if (
      isRestoration &&
      !window.confirm(
        "Khôi phục đơn về Chờ thanh toán? Tồn kho và quyền lợi túi mù ban đầu sẽ được giữ lại cho đơn này."
      )
    ) {
      return;
    }
    if (
      !isRestoration &&
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
        : isRestoration
          ? `/api/admin/orders/${orderId}/restore`
          : `/api/admin/orders/${orderId}/status`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isCancellation
            ? { reason: cancelReason.trim() }
            : isRestoration
              ? {}
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
    toast.success(
      isRestoration
        ? "Đã khôi phục đơn về Chờ thanh toán."
        : "Đã cập nhật trạng thái đơn hàng."
    );
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
          {STATUS_OPTIONS.map((option) => {
            const isRestorationOption =
              canRestoreCancelledOrder(status) && option === "PENDING_PAYMENT";
            const isDisabled =
              option !== status &&
              ((!isRestorationOption &&
                !ORDER_STATUS_TRANSITIONS[status].includes(option)) ||
                (status === "PENDING_PAYMENT" && option === "PROCESSING"));

            return (
              <option
                key={option}
                value={option}
                disabled={isDisabled}
                style={{ color: isDisabled ? "#555" : "inherit" }}
              >
                {STATUS_LABEL[option]}
              </option>
            );
          })}
        </select>
        <button
          className={adminSecondaryButtonClass}
          disabled={saving}
          onClick={submit}
          type="button"
        >
          {saving ? "Đang lưu" : "Cập nhật"}
        </button>
      </div>
      {nextStatus === "CANCELLED" ? (
        <label className="grid gap-2 text-sm font-bold text-white">
          Lý do huỷ *
          <textarea
            className={`${adminInputClass} min-h-24 py-3`}
            minLength={10}
            required
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            placeholder="Nhập lý do huỷ đơn hàng (ít nhất 10 ký tự)"
          />
        </label>
      ) : null}
    </div>
  );
}

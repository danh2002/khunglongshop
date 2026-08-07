"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminSecondaryButtonClass } from "./AdminUi";

export default function PaymentConfirmationButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function confirmPayment() {
    if (saving) return;
    if (!window.confirm("Xác nhận cửa hàng đã nhận đủ tiền cho đơn hàng này?")) {
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/payment/confirm`, {
        method: "POST",
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error?.message || "PAYMENT_CONFIRMATION_FAILED");
      }
      toast.success("Đã xác nhận thanh toán.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Không thể xác nhận thanh toán."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <button
      className={adminSecondaryButtonClass}
      disabled={saving}
      onClick={confirmPayment}
      type="button"
    >
      {saving ? "Đang xác nhận" : "Xác nhận đã nhận tiền"}
    </button>
  );
}

"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

type Values = {
  siteName: string;
  supportEmail: string;
  supportPhone: string;
  shippingNotice: string;
  maintenanceMode: boolean;
  defaultLocale: "vi" | "en" | "zh";
};

export default function SettingsForm({
  initial,
  updatedAt,
  updatedBy,
}: {
  initial: Values;
  updatedAt: string;
  updatedBy: string | null;
}) {
  const [values, setValues] = useState(initial);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (
      values.maintenanceMode !== initial.maintenanceMode &&
      !window.confirm(
        values.maintenanceMode
          ? "Bật chế độ bảo trì sẽ chặn storefront và checkout. Tiếp tục?"
          : "Tắt chế độ bảo trì?"
      )
    ) {
      return;
    }
    setSaving(true);
    const response = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        supportEmail: values.supportEmail || null,
        supportPhone: values.supportPhone || null,
        shippingNotice: values.shippingNotice || null,
      }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể lưu cài đặt.");
      return;
    }
    toast.success("Đã lưu cài đặt.");
  }

  return (
    <div className="grid max-w-3xl gap-6">
      <section className="grid gap-4 border border-white/10 bg-[#0f0f0f] p-5 md:grid-cols-2">
        <h2 className="font-black uppercase md:col-span-2">Nhận diện và liên hệ</h2>
        <label className="grid gap-2 text-sm font-bold text-white/70">
          Tên website
          <input className={adminInputClass} value={values.siteName} onChange={(e) => setValues({ ...values, siteName: e.target.value })} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-white/70">
          Ngôn ngữ mặc định
          <select className={adminInputClass} value={values.defaultLocale} onChange={(e) => setValues({ ...values, defaultLocale: e.target.value as Values["defaultLocale"] })}>
            <option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh">中文</option>
          </select>
        </label>
        <label className="grid gap-2 text-sm font-bold text-white/70">
          Email hỗ trợ
          <input className={adminInputClass} type="email" value={values.supportEmail} onChange={(e) => setValues({ ...values, supportEmail: e.target.value })} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-white/70">
          Điện thoại hỗ trợ
          <input className={adminInputClass} value={values.supportPhone} onChange={(e) => setValues({ ...values, supportPhone: e.target.value })} />
        </label>
        <label className="grid gap-2 text-sm font-bold text-white/70 md:col-span-2">
          Thông báo vận chuyển
          <textarea className={`${adminInputClass} min-h-28 py-3`} value={values.shippingNotice} onChange={(e) => setValues({ ...values, shippingNotice: e.target.value })} />
        </label>
      </section>
      <section className="border border-white/10 bg-[#0f0f0f] p-5">
        <h2 className="font-black uppercase">Chế độ bảo trì</h2>
        <label className="mt-4 flex items-center gap-3 text-sm text-white/70">
          <input type="checkbox" checked={values.maintenanceMode} onChange={(e) => setValues({ ...values, maintenanceMode: e.target.checked })} />
          Chặn storefront và commerce API công khai
        </label>
      </section>
      <div>
        <button className={adminSecondaryButtonClass} disabled={saving} onClick={save} type="button">
          {saving ? "Đang lưu" : "Lưu cài đặt"}
        </button>
        <p className="mt-3 text-xs text-white/40">
          Cập nhật lần cuối: {new Date(updatedAt).toLocaleString("vi-VN")}
          {updatedBy ? ` bởi ${updatedBy}` : ""}
        </p>
      </div>
    </div>
  );
}

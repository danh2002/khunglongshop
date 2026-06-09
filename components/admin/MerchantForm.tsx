"use client";

import type { MerchantStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

type MerchantValues = {
  name: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  status: MerchantStatus;
};

export default function MerchantForm({
  id,
  initial,
  productCount = 0,
}: {
  id?: string;
  initial?: MerchantValues;
  productCount?: number;
}) {
  const router = useRouter();
  const [values, setValues] = useState<MerchantValues>(
    initial ?? {
      name: "",
      email: "",
      phone: "",
      address: "",
      description: "",
      status: "ACTIVE",
    }
  );
  const [saving, setSaving] = useState(false);

  function change(field: keyof MerchantValues, value: string) {
    setValues((current) => ({ ...current, [field]: value }));
  }

  async function save() {
    setSaving(true);
    const response = await fetch(id ? `/api/admin/merchants/${id}` : "/api/admin/merchants", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...values,
        email: values.email || null,
        phone: values.phone || null,
        address: values.address || null,
        description: values.description || null,
      }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể lưu merchant.");
      return;
    }
    toast.success(id ? "Đã cập nhật merchant." : "Đã tạo merchant.");
    router.push("/admin/merchant");
    router.refresh();
  }

  async function remove() {
    if (!id || !window.confirm(`Xóa merchant "${values.name}"?`)) return;
    const response = await fetch(`/api/admin/merchants/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể xóa merchant.");
      return;
    }
    toast.success("Đã xóa merchant.");
    router.push("/admin/merchant");
    router.refresh();
  }

  return (
    <div className="grid max-w-3xl gap-4 border border-white/10 bg-[#0f0f0f] p-5 md:grid-cols-2">
      <label className="grid gap-2 text-sm font-bold text-white/70">
        Tên
        <input className={adminInputClass} value={values.name} onChange={(e) => change("name", e.target.value)} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-white/70">
        Trạng thái
        <select className={adminInputClass} value={values.status} onChange={(e) => change("status", e.target.value)}>
          <option value="ACTIVE">ACTIVE</option>
          <option value="INACTIVE">INACTIVE</option>
        </select>
      </label>
      <label className="grid gap-2 text-sm font-bold text-white/70">
        Email
        <input className={adminInputClass} type="email" value={values.email} onChange={(e) => change("email", e.target.value)} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-white/70">
        Điện thoại
        <input className={adminInputClass} value={values.phone} onChange={(e) => change("phone", e.target.value)} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-white/70 md:col-span-2">
        Địa chỉ
        <input className={adminInputClass} value={values.address} onChange={(e) => change("address", e.target.value)} />
      </label>
      <label className="grid gap-2 text-sm font-bold text-white/70 md:col-span-2">
        Mô tả
        <textarea className={`${adminInputClass} min-h-28 py-3`} value={values.description} onChange={(e) => change("description", e.target.value)} />
      </label>
      <div className="flex flex-wrap gap-3 md:col-span-2">
        <button className={adminSecondaryButtonClass} disabled={saving} onClick={save} type="button">
          {saving ? "Đang lưu" : "Lưu"}
        </button>
        {id ? (
          <button
            className="min-h-10 border border-red-500/40 px-4 text-sm font-bold uppercase text-red-300 disabled:opacity-40"
            disabled={productCount > 0}
            onClick={remove}
            type="button"
          >
            Xóa
          </button>
        ) : null}
      </div>
      {productCount > 0 ? (
        <p className="text-sm text-amber-300 md:col-span-2">
          Merchant đang có {productCount} sản phẩm; hãy chuyển sang INACTIVE thay vì xóa.
        </p>
      ) : null}
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

export default function CategoryForm({
  id,
  initialName = "",
  initialSlug = "",
  initialIcon = "",
  initialDescription = "",
  productCount = 0,
}: {
  id?: string;
  initialName?: string;
  initialSlug?: string;
  initialIcon?: string;
  initialDescription?: string;
  productCount?: number;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [icon, setIcon] = useState(initialIcon);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch(id ? `/api/admin/categories/${id}` : "/api/admin/categories", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, icon, description }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể lưu danh mục.");
      return;
    }
    toast.success(id ? "Đã cập nhật danh mục." : "Đã tạo danh mục.");
    router.push("/admin/categories");
    router.refresh();
  }

  async function remove() {
    if (!id || !window.confirm(`Xóa danh mục "${initialName}"?`)) return;
    const response = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể xóa danh mục.");
      return;
    }
    toast.success("Đã xóa danh mục.");
    router.push("/admin/categories");
    router.refresh();
  }

  return (
    <div className="max-w-xl border border-white/10 bg-[#0f0f0f] p-5">
      <label className="grid gap-2 text-sm font-bold text-white/70">
        Tên danh mục
        <input
          className={adminInputClass}
          maxLength={100}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-bold text-white/70">
        Slug
        <input
          className={adminInputClass}
          maxLength={120}
          value={slug}
          onChange={(event) => setSlug(event.target.value)}
          placeholder="tu-dong-tu-ten-neu-de-trong"
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-bold text-white/70">
        Icon
        <input
          className={adminInputClass}
          maxLength={500}
          value={icon}
          onChange={(event) => setIcon(event.target.value)}
          placeholder="Emoji hoặc đường dẫn ảnh"
        />
      </label>
      <label className="mt-4 grid gap-2 text-sm font-bold text-white/70">
        Mô tả
        <textarea
          className={adminInputClass}
          maxLength={1000}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <div className="mt-5 flex flex-wrap gap-3">
        <button className={adminSecondaryButtonClass} disabled={saving} onClick={save} type="button">
          {saving ? "Đang lưu" : id ? "Lưu thay đổi" : "Tạo danh mục"}
        </button>
        {id && productCount === 0 ? (
          <button
            type="button"
            onClick={remove}
            disabled={saving}
            className="min-h-10 border border-red-600 px-4 text-sm font-black uppercase text-red-500 hover:bg-red-600 hover:text-white disabled:opacity-50"
          >
            Xóa danh mục
          </button>
        ) : null}
        {id && productCount > 0 ? (
          <button
            type="button"
            disabled={saving}
            onClick={async () => {
              if (!window.confirm(`XÓA CƯỠNG BỨC danh mục "${initialName}" và gỡ liên kết ${productCount} sản phẩm? Hành động này không thể hoàn tác.`)) return;
              const response = await fetch(`/api/admin/categories/${id}?force=true`, { method: "DELETE" });
              const body = await response.json().catch(() => null);
              if (!response.ok) {
                toast.error(body?.error?.message ?? "Không thể xóa cưỡng bức danh mục.");
                return;
              }
              toast.success("Đã xóa cưỡng bức danh mục.");
              router.push("/admin/categories");
              router.refresh();
            }}
            className="min-h-10 border border-red-800 bg-red-950 px-4 text-sm font-black uppercase text-red-400 hover:bg-red-700 hover:text-white disabled:opacity-50"
          >
            Xóa cưỡng bức
          </button>
        ) : null}
      </div>
      {id && productCount > 0 ? (
        <p className="text-xs text-white/40">
          Danh mục có {productCount} sản phẩm, không thể xóa.
        </p>
      ) : null}
    </div>
  );
}

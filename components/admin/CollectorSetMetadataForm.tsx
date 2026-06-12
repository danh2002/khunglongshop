"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

export default function CollectorSetMetadataForm({
  id,
  initialName,
  initialSlug,
  initialImage,
  initialDescription,
}: {
  id: string;
  initialName: string;
  initialSlug: string;
  initialImage: string;
  initialDescription: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [image, setImage] = useState(initialImage);
  const [description, setDescription] = useState(initialDescription);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/admin/collector-sets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, image, description }),
    });
    const body = await response.json().catch(() => null);
    setSaving(false);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể lưu bộ sưu tập.");
      return;
    }
    toast.success("Đã cập nhật bộ sưu tập.");
    router.refresh();
  }

  return (
    <section className="mt-6 grid gap-3 border border-white/10 bg-[#0f0f0f] p-5">
      <h2 className="font-black uppercase text-white">Thông tin hiển thị</h2>
      <input className={adminInputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Tên" />
      <input className={adminInputClass} value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="Slug" />
      <input className={adminInputClass} value={image} onChange={(event) => setImage(event.target.value)} placeholder="Đường dẫn ảnh" />
      <textarea className={adminInputClass} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả" rows={4} />
      <button className={adminSecondaryButtonClass} disabled={saving} onClick={save} type="button">
        {saving ? "Đang lưu" : "Lưu thông tin"}
      </button>
    </section>
  );
}

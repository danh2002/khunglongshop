"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

export default function CollectorSetCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [image, setImage] = useState("");
  const [description, setDescription] = useState("");

  async function create() {
    const response = await fetch("/api/admin/collector-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, slug, image, description, totalSlots: 10 }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể tạo bộ sưu tập.");
      return;
    }
    toast.success("Đã tạo bộ sưu tập.");
    setName("");
    setSlug("");
    setImage("");
    setDescription("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <button className={adminSecondaryButtonClass} onClick={() => setOpen(!open)} type="button">
        Tạo bộ sưu tập
      </button>
      {open ? (
        <div className="mt-3 grid min-w-[360px] gap-2">
          <input className={adminInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên bộ sưu tập" />
          <input className={adminInputClass} value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Slug (tự động nếu để trống)" />
          <input className={adminInputClass} value={image} onChange={(e) => setImage(e.target.value)} placeholder="Đường dẫn ảnh" />
          <textarea className={adminInputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả" rows={3} />
          <button className={adminSecondaryButtonClass} onClick={create} type="button">Lưu</button>
        </div>
      ) : null}
    </div>
  );
}

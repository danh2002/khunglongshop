"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

export default function CollectorSetCreateForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  async function create() {
    const response = await fetch("/api/admin/collector-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, totalSlots: 10 }),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể tạo bộ sưu tập.");
      return;
    }
    toast.success("Đã tạo bộ sưu tập.");
    setName("");
    setOpen(false);
    router.refresh();
  }

  return (
    <div>
      <button className={adminSecondaryButtonClass} onClick={() => setOpen(!open)} type="button">
        Tạo bộ sưu tập
      </button>
      {open ? (
        <div className="mt-3 flex min-w-[300px] gap-2">
          <input className={adminInputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Tên bộ sưu tập" />
          <button className={adminSecondaryButtonClass} onClick={create} type="button">Lưu</button>
        </div>
      ) : null}
    </div>
  );
}

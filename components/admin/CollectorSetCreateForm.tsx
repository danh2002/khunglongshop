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
  const [heroImage, setHeroImage] = useState("");
  const [heroBadge, setHeroBadge] = useState("");
  const [heroTitle, setHeroTitle] = useState("");
  const [heroSubtitle, setHeroSubtitle] = useState("");
  const [heroPrimaryCtaLabel, setHeroPrimaryCtaLabel] = useState("");
  const [heroPrimaryCtaUrl, setHeroPrimaryCtaUrl] = useState("");
  const [heroSecondaryCtaLabel, setHeroSecondaryCtaLabel] = useState("");
  const [heroSecondaryCtaUrl, setHeroSecondaryCtaUrl] = useState("");
  const [showHero, setShowHero] = useState(true);

  async function create() {
    const response = await fetch("/api/admin/collector-sets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        image,
        description,
        totalSlots: 10,
        heroImage,
        heroBadge,
        heroTitle,
        heroSubtitle,
        heroPrimaryCtaLabel,
        heroPrimaryCtaUrl,
        heroSecondaryCtaLabel,
        heroSecondaryCtaUrl,
        showHero,
      }),
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
    setHeroImage("");
    setHeroBadge("");
    setHeroTitle("");
    setHeroSubtitle("");
    setHeroPrimaryCtaLabel("");
    setHeroPrimaryCtaUrl("");
    setHeroSecondaryCtaLabel("");
    setHeroSecondaryCtaUrl("");
    setShowHero(true);
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
          <input className={adminInputClass} value={image} onChange={(e) => setImage(e.target.value)} placeholder="Đường dẫn ảnh đại diện" />
          <textarea className={adminInputClass} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Mô tả" rows={3} />
          <div className="mt-2 grid gap-2 border border-white/10 p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-white/60">Hero đầu trang</p>
            <label className="flex items-center gap-2 text-sm text-white/70">
              <input checked={showHero} onChange={(event) => setShowHero(event.target.checked)} type="checkbox" />
              Hiện hero
            </label>
            <input className={adminInputClass} value={heroImage} onChange={(e) => setHeroImage(e.target.value)} placeholder="Hero image path (/images/...)" />
            <input className={adminInputClass} value={heroBadge} onChange={(e) => setHeroBadge(e.target.value)} placeholder="Hero badge" />
            <input className={adminInputClass} value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="Hero title" />
            <textarea className={adminInputClass} value={heroSubtitle} onChange={(e) => setHeroSubtitle(e.target.value)} placeholder="Hero subtitle" rows={2} />
            <input className={adminInputClass} value={heroPrimaryCtaLabel} onChange={(e) => setHeroPrimaryCtaLabel(e.target.value)} placeholder="Primary CTA label" />
            <input className={adminInputClass} value={heroPrimaryCtaUrl} onChange={(e) => setHeroPrimaryCtaUrl(e.target.value)} placeholder="Primary CTA URL (/...)" />
            <input className={adminInputClass} value={heroSecondaryCtaLabel} onChange={(e) => setHeroSecondaryCtaLabel(e.target.value)} placeholder="Secondary CTA label" />
            <input className={adminInputClass} value={heroSecondaryCtaUrl} onChange={(e) => setHeroSecondaryCtaUrl(e.target.value)} placeholder="Secondary CTA URL (/...)" />
          </div>
          <button className={adminSecondaryButtonClass} onClick={create} type="button">Lưu</button>
        </div>
      ) : null}
    </div>
  );
}

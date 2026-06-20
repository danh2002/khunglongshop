"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";
import ImageUploadDropzone from "./ImageUploadDropzone";

type CollectorSetMetadataFormProps = {
  id: string;
  initialName: string;
  initialSlug: string;
  initialImage: string;
  initialDescription: string;
  initialHeroImage: string;
  initialHeroBadge: string;
  initialHeroTitle: string;
  initialHeroSubtitle: string;
  initialHeroPrimaryCtaLabel: string;
  initialHeroPrimaryCtaUrl: string;
  initialHeroSecondaryCtaLabel: string;
  initialHeroSecondaryCtaUrl: string;
  initialShowHero: boolean;
};

export default function CollectorSetMetadataForm({
  id,
  initialName,
  initialSlug,
  initialImage,
  initialDescription,
  initialHeroImage,
  initialHeroBadge,
  initialHeroTitle,
  initialHeroSubtitle,
  initialHeroPrimaryCtaLabel,
  initialHeroPrimaryCtaUrl,
  initialHeroSecondaryCtaLabel,
  initialHeroSecondaryCtaUrl,
  initialShowHero,
}: CollectorSetMetadataFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [image, setImage] = useState(initialImage);
  const [description, setDescription] = useState(initialDescription);
  const [heroImage, setHeroImage] = useState(initialHeroImage);
  const [heroBadge, setHeroBadge] = useState(initialHeroBadge);
  const [heroTitle, setHeroTitle] = useState(initialHeroTitle);
  const [heroSubtitle, setHeroSubtitle] = useState(initialHeroSubtitle);
  const [heroPrimaryCtaLabel, setHeroPrimaryCtaLabel] = useState(initialHeroPrimaryCtaLabel);
  const [heroPrimaryCtaUrl, setHeroPrimaryCtaUrl] = useState(initialHeroPrimaryCtaUrl);
  const [heroSecondaryCtaLabel, setHeroSecondaryCtaLabel] = useState(initialHeroSecondaryCtaLabel);
  const [heroSecondaryCtaUrl, setHeroSecondaryCtaUrl] = useState(initialHeroSecondaryCtaUrl);
  const [showHero, setShowHero] = useState(initialShowHero);
  const [uploadingHeroImage, setUploadingHeroImage] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const response = await fetch(`/api/admin/collector-sets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        slug,
        image,
        description,
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
      <input className={adminInputClass} value={image} onChange={(event) => setImage(event.target.value)} placeholder="Đường dẫn ảnh đại diện" />
      <textarea className={adminInputClass} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Mô tả" rows={4} />
      <div className="mt-2 grid gap-3 border border-white/10 p-4">
        <p className="text-xs font-black uppercase tracking-[0.12em] text-white/60">Hero đầu trang</p>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input checked={showHero} onChange={(event) => setShowHero(event.target.checked)} type="checkbox" />
          Hiện hero
        </label>
        <ImageUploadDropzone
          value={heroImage}
          alt={heroTitle || name || "Hero image"}
          folder="homepage-slider"
          disabled={saving}
          onChange={setHeroImage}
          onUploadingChange={setUploadingHeroImage}
        />
        <input className={adminInputClass} value={heroBadge} onChange={(event) => setHeroBadge(event.target.value)} placeholder="Hero badge" />
        <input className={adminInputClass} value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} placeholder="Hero title" />
        <textarea className={adminInputClass} value={heroSubtitle} onChange={(event) => setHeroSubtitle(event.target.value)} placeholder="Hero subtitle" rows={2} />
        <div className="grid gap-2 md:grid-cols-2">
          <input className={adminInputClass} value={heroPrimaryCtaLabel} onChange={(event) => setHeroPrimaryCtaLabel(event.target.value)} placeholder="Primary CTA label" />
          <input className={adminInputClass} value={heroPrimaryCtaUrl} onChange={(event) => setHeroPrimaryCtaUrl(event.target.value)} placeholder="Primary CTA URL (/...)" />
          <input className={adminInputClass} value={heroSecondaryCtaLabel} onChange={(event) => setHeroSecondaryCtaLabel(event.target.value)} placeholder="Secondary CTA label" />
          <input className={adminInputClass} value={heroSecondaryCtaUrl} onChange={(event) => setHeroSecondaryCtaUrl(event.target.value)} placeholder="Secondary CTA URL (/...)" />
        </div>
      </div>
      <button className={adminSecondaryButtonClass} disabled={saving || uploadingHeroImage} onClick={save} type="button">
        {saving ? "Đang lưu" : "Lưu thông tin"}
      </button>
    </section>
  );
}

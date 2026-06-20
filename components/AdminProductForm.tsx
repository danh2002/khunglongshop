"use client";

import { normalizeSlug } from "@/lib/adminProduct";
import ImageManager from "@/components/admin/ImageManager";
import { FormEvent, useMemo, useState } from "react";

export type ProductFormValues = {
  title: string;
  slug: string;
  mainImage: string;
  images: string[];
  price: number;
  rating: number;
  description: string;
  manufacturer: string;
  inStock: number;
  categoryId: string;
  merchantId: string;
  isCollector: boolean;
  isVisible: boolean;
  setId: string | null;
  setSlotNumber: number | null;
  isBlindBox: boolean;
  blindBoxSetId: string | null;
};

export type ProductReferenceData = {
  categories: Array<{ id: string; name: string }>;
  merchants: Array<{ id: string; name: string }>;
  collectorSets: Array<{
    id: string;
    name: string;
    totalSlots: number;
    products: Array<{ id: string; title: string; setSlotNumber: number | null }>;
  }>;
};

type AdminProductFormProps = {
  value: ProductFormValues;
  references: ProductReferenceData;
  currentProductId?: string;
  isSaving: boolean;
  submitLabel: string;
  onChange: (value: ProductFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onUploadingChange?: (isUploading: boolean) => void;
};

export default function AdminProductForm({
  value,
  references,
  currentProductId,
  isSaving,
  submitLabel,
  onChange,
  onSubmit,
  onUploadingChange,
}: AdminProductFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const selectedSet = references.collectorSets.find((set) => set.id === value.setId);
  const availableSlots = useMemo(() => {
    if (!selectedSet) return [];

    return Array.from({ length: selectedSet.totalSlots }, (_, index) => {
      const slotNumber = index + 1;
      const occupant = selectedSet.products.find((product) => product.setSlotNumber === slotNumber);

      return {
        slotNumber,
        disabled: Boolean(occupant && occupant.id !== currentProductId),
        label: occupant && occupant.id !== currentProductId ? `${slotNumber} - ${occupant.title}` : `${slotNumber}`,
      };
    });
  }, [currentProductId, selectedSet]);

  return (
    <form onSubmit={onSubmit} className="grid gap-5 border border-[#e85d00]/25 bg-white/[0.03] p-5">
      <div className="grid gap-5 lg:grid-cols-2">
        <label className="grid gap-2 text-sm font-black uppercase text-white/70">
          Tên sản phẩm
          <input
            required
            value={value.title}
            onChange={(event) => {
              const title = event.target.value;
              onChange({ ...value, title, slug: value.slug ? value.slug : normalizeSlug(title) });
            }}
            className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
          />
        </label>

        <label className="grid gap-2 text-sm font-black uppercase text-white/70">
          Slug
          <input
            required
            value={value.slug}
            onChange={(event) => onChange({ ...value, slug: normalizeSlug(event.target.value) })}
            className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
          />
        </label>

        <label className="grid gap-2 text-sm font-black uppercase text-white/70">
          Giá VND
          <input
            type="number"
            min={0}
            required
            value={value.price}
            onChange={(event) => onChange({ ...value, price: Number(event.target.value) })}
            className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
          />
        </label>

        <label className="grid gap-2 text-sm font-black uppercase text-white/70">
          Tồn kho
          <input
            type="number"
            min={0}
            required
            value={value.inStock}
            onChange={(event) => onChange({ ...value, inStock: Number(event.target.value) })}
            className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
          />
        </label>

        <label className="grid gap-2 text-sm font-black uppercase text-white/70">
          Nhà sản xuất
          <input
            required
            value={value.manufacturer}
            onChange={(event) => onChange({ ...value, manufacturer: event.target.value })}
            className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
          />
        </label>

        <label className="grid gap-2 text-sm font-black uppercase text-white/70">
          Danh mục
          <select
            required
            value={value.categoryId}
            onChange={(event) => onChange({ ...value, categoryId: event.target.value })}
            className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
          >
            <option value="">Chọn danh mục</option>
            {references.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-black uppercase text-white/70">
          Merchant
          <select
            required
            value={value.merchantId}
            onChange={(event) => onChange({ ...value, merchantId: event.target.value })}
            className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
          >
            <option value="">Chọn merchant</option>
            {references.merchants.map((merchant) => (
              <option key={merchant.id} value={merchant.id}>
                {merchant.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-3 border-t border-white/10 pt-5">
        <label className="flex items-center gap-3 text-sm font-black uppercase text-white/70">
          <input
            type="checkbox"
            checked={value.isCollector}
            onChange={(event) =>
              onChange({
                ...value,
                isCollector: event.target.checked,
                isVisible: event.target.checked ? false : value.isVisible,
                setId: event.target.checked ? value.setId : null,
                setSlotNumber: event.target.checked ? value.setSlotNumber : null,
                isBlindBox: event.target.checked ? false : value.isBlindBox,
                blindBoxSetId: event.target.checked ? null : value.blindBoxSetId,
              })
            }
          />
          Sản phẩm sưu tập
        </label>

        {value.isCollector ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <label className="grid gap-2 text-sm font-black uppercase text-white/70">
              Bộ sưu tập
              <select
                value={value.setId || ""}
                onChange={(event) => onChange({ ...value, setId: event.target.value || null, setSlotNumber: null })}
                className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
              >
                <option value="">Chọn bộ</option>
                {references.collectorSets.map((collectorSet) => (
                  <option key={collectorSet.id} value={collectorSet.id}>
                    {collectorSet.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-black uppercase text-white/70">
              Slot
              <select
                value={value.setSlotNumber || ""}
                onChange={(event) => onChange({ ...value, setSlotNumber: event.target.value ? Number(event.target.value) : null })}
                className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
              >
                <option value="">Chọn slot</option>
                {availableSlots.map((slot) => (
                  <option key={slot.slotNumber} value={slot.slotNumber} disabled={slot.disabled}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}

        <label className="flex items-center gap-3 text-sm font-black uppercase text-white/70">
          <input
            type="checkbox"
            checked={value.isVisible}
            disabled={value.isCollector}
            onChange={(event) =>
              onChange({
                ...value,
                isVisible: event.target.checked,
              })
            }
          />
          Hiển thị ở shop
        </label>

        <label className="flex items-center gap-3 text-sm font-black uppercase text-white/70">
          <input
            type="checkbox"
            checked={value.isBlindBox}
            onChange={(event) =>
              onChange({
                ...value,
                isBlindBox: event.target.checked,
                isVisible: event.target.checked ? true : value.isVisible,
                blindBoxSetId: event.target.checked ? value.blindBoxSetId : null,
                isCollector: event.target.checked ? false : value.isCollector,
                setId: event.target.checked ? null : value.setId,
                setSlotNumber: event.target.checked ? null : value.setSlotNumber,
              })
            }
          />
          Sản phẩm túi mù
        </label>

        {value.isBlindBox ? (
          <label className="grid gap-2 text-sm font-black uppercase text-white/70">
            Bộ sưu tập của túi mù
            <select
              value={value.blindBoxSetId || ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  blindBoxSetId: event.target.value || null,
                })
              }
              className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none focus:border-[#e85d00]"
            >
              <option value="">Chọn bộ sưu tập</option>
              {references.collectorSets.map((collectorSet) => (
                <option key={collectorSet.id} value={collectorSet.id}>
                  {collectorSet.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <label className="grid gap-2 text-sm font-black uppercase text-white/70">
        Mô tả
        <textarea
          required
          value={value.description}
          onChange={(event) => onChange({ ...value, description: event.target.value })}
          className="min-h-36 border border-[#e85d00]/40 bg-[#111] px-4 py-3 text-white outline-none focus:border-[#e85d00]"
        />
      </label>

      <ImageManager
        mainImage={value.mainImage}
        images={value.images}
        title={value.title}
        onMainImageChange={(mainImage) => onChange({ ...value, mainImage })}
        onImagesChange={(images) => onChange({ ...value, images })}
        onUploadingChange={(uploading) => {
          setIsUploading(uploading);
          onUploadingChange?.(uploading);
        }}
      />

      <button
        type="submit"
        disabled={isSaving || isUploading}
        className="min-h-12 bg-[#e85d00] px-5 font-black uppercase text-white hover:bg-[#ff7417] disabled:opacity-50"
      >
        {isSaving ? "Đang lưu..." : isUploading ? "Đang tải ảnh..." : submitLabel}
      </button>
    </form>
  );
}

"use client";

import Image from "next/image";
import { type ChangeEvent, type DragEvent, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaUpload, FaXmark } from "react-icons/fa6";
import { normalizeImageForDisplay } from "@/lib/adminProduct";

const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

type ImageUploadDropzoneProps = {
  value: string;
  alt: string;
  folder?: "products" | "homepage-slider";
  disabled?: boolean;
  onChange: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
};

function getFilename(url: string) {
  return decodeURIComponent(url.split("/").pop() || url);
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return "Chỉ hỗ trợ JPG, PNG, WEBP hoặc GIF.";
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return "Ảnh không được vượt quá 5MB.";
  }

  return null;
}

export default function ImageUploadDropzone({
  value,
  alt,
  folder = "products",
  disabled = false,
  onChange,
  onUploadingChange,
}: ImageUploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function uploadFile(file: File) {
    const validationMessage = validateImageFile(file);
    if (validationMessage) {
      toast.error(validationMessage);
      return;
    }

    const formData = new FormData();
    formData.set("file", file);
    formData.set("folder", folder);

    setIsUploading(true);
    onUploadingChange?.(true);
    try {
      const response = await fetch("/api/admin/upload", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok || typeof payload?.url !== "string") {
        throw new Error(payload?.error?.message || "Tải ảnh thất bại.");
      }

      onChange(payload.url);
      toast.success("Đã tải ảnh lên.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tải ảnh thất bại.");
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  }

  async function handleFileInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) await uploadFile(file);
  }

  function handleDrop(event: DragEvent<HTMLButtonElement>) {
    event.preventDefault();
    setIsDragging(false);
    const file = event.dataTransfer.files[0];
    if (file) void uploadFile(file);
  }

  const isDisabled = disabled || isUploading;

  return (
    <div className="grid gap-2">
      <button
        type="button"
        disabled={isDisabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault();
          if (!isDisabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={[
          "grid min-h-[164px] place-items-center border border-dashed bg-[#0a0a0a] px-4 py-4 text-center text-sm text-white/65 outline-none transition",
          isDragging ? "border-[#e85d00] bg-[#e85d00]/10" : "border-[#2d2d2d]",
          isDisabled ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-[#e85d00] hover:bg-[#e85d00]/10",
        ].join(" ")}
      >
        <span className="grid justify-items-center gap-2">
          {value ? (
            <span className="relative h-32 w-full max-w-[340px] overflow-hidden border border-white/10 bg-[#050505]">
              <Image
                src={normalizeImageForDisplay(value)}
                alt={alt || "Ảnh đã upload"}
                fill
                sizes="340px"
                className="object-cover"
              />
            </span>
          ) : (
            <FaUpload size={28} className="text-[#e85d00]" />
          )}
          <strong className="text-white/80">
            {isUploading ? "Đang tải ảnh..." : "Kéo thả hoặc bấm để upload"}
          </strong>
          <span className="text-xs text-white/45">JPG, PNG, WEBP, GIF · tối đa 5MB</span>
          {value ? (
            <span className="max-w-full truncate text-xs text-white/45" title={value}>
              {getFilename(value)}
            </span>
          ) : null}
        </span>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="max-w-full truncate text-xs text-white/40" title={value}>
          {value || "/images/..."}
        </span>
        {value ? (
          <button
            type="button"
            disabled={isDisabled}
            onClick={() => onChange("")}
            className="inline-flex min-h-8 items-center gap-2 border border-white/15 bg-white/5 px-3 text-xs font-black uppercase text-white/70 transition hover:border-red-500 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FaXmark />
            Xóa ảnh
          </button>
        ) : null}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileInput} />
    </div>
  );
}

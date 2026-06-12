"use client";

import { ChangeEvent, useRef, useState } from "react";
import Image from "next/image";
import styled, { keyframes } from "styled-components";
import toast from "react-hot-toast";
import { normalizeImageForDisplay } from "@/lib/adminProduct";

type ImageManagerProps = {
  mainImage: string;
  images: string[];
  title: string;
  onMainImageChange: (url: string) => void;
  onImagesChange: (urls: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
};

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const Manager = styled.section`
  display: grid;
  gap: 20px;
  border-top: 1px solid rgb(255 255 255 / 10%);
  padding-top: 20px;
`;

const Section = styled.div`
  display: grid;
  gap: 10px;
`;

const Label = styled.h3`
  margin: 0;
  color: rgb(255 255 255 / 70%);
  font-size: 0.875rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const MainRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
`;

const Thumbnail = styled.div<{ $size: number }>`
  position: relative;
  width: ${({ $size }) => $size}px;
  height: ${({ $size }) => $size}px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 2px solid #333;
  background: #111;
  transition: border-color 150ms ease;

  &:hover {
    border-color: #e85d00;
  }
`;

const EmptyThumbnail = styled(Thumbnail)`
  display: grid;
  place-items: center;
  color: rgb(255 255 255 / 45%);
  font-size: 0.75rem;
  text-align: center;
`;

const Filename = styled.p`
  max-width: 240px;
  margin: 8px 0 0;
  overflow: hidden;
  color: rgb(255 255 255 / 55%);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ActionButton = styled.button`
  min-height: 42px;
  border: 1px solid #e85d00;
  background: #e85d00;
  padding: 0 16px;
  color: white;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    background: #ff7417;
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const Gallery = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
`;

const AddButton = styled.button`
  position: relative;
  display: grid;
  width: 80px;
  height: 80px;
  place-items: center;
  border: 2px dashed #e85d00;
  background: transparent;
  padding: 6px;
  color: #e85d00;
  font-size: 0.75rem;
  font-weight: 900;
  text-align: center;
  text-transform: uppercase;
  cursor: pointer;

  &:hover {
    background: rgb(232 93 0 / 10%);
  }

  &:disabled {
    cursor: not-allowed;
    opacity: 0.5;
  }
`;

const DeleteButton = styled.button`
  position: absolute;
  z-index: 2;
  top: 3px;
  right: 3px;
  display: grid;
  width: 20px;
  height: 20px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #cc0000;
  padding: 0;
  color: white;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
`;

const Spinner = styled.span`
  position: absolute;
  z-index: 3;
  top: 50%;
  left: 50%;
  width: 28px;
  height: 28px;
  margin: -14px 0 0 -14px;
  border: 3px solid rgb(232 93 0 / 25%);
  border-top-color: #e85d00;
  border-radius: 50%;
  animation: ${spin} 700ms linear infinite;
`;

const HiddenInput = styled.input`
  display: none;
`;

function getFilename(url: string) {
  return decodeURIComponent(url.split("/").pop() || url);
}

async function uploadImage(file: File) {
  const formData = new FormData();
  formData.set("file", file);

  const response = await fetch("/api/admin/upload", {
    method: "POST",
    body: formData,
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok || typeof payload?.url !== "string") {
    throw new Error(payload?.error?.message || "Upload failed");
  }

  return payload.url as string;
}

export default function ImageManager({
  mainImage,
  images,
  title,
  onMainImageChange,
  onImagesChange,
  onUploadingChange,
}: ImageManagerProps) {
  const mainInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const [isMainUploading, setIsMainUploading] = useState(false);
  const [isGalleryUploading, setIsGalleryUploading] = useState(false);
  const isUploading = isMainUploading || isGalleryUploading;

  async function handleMainImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setIsMainUploading(true);
    onUploadingChange?.(true);
    try {
      onMainImageChange(await uploadImage(file));
    } catch {
      toast.error("Tải ảnh thất bại, thử lại");
    } finally {
      setIsMainUploading(false);
      onUploadingChange?.(false);
    }
  }

  async function handleGalleryImages(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    if (selectedFiles.length === 0) return;

    const remainingSlots = 8 - images.length;
    if (remainingSlots <= 0) {
      toast.error("Tối đa 8 ảnh phụ");
      return;
    }

    if (selectedFiles.length > remainingSlots) {
      toast.error("Tối đa 8 ảnh phụ");
    }

    setIsGalleryUploading(true);
    onUploadingChange?.(true);
    try {
      const uploadedUrls = await Promise.all(selectedFiles.slice(0, remainingSlots).map(uploadImage));
      onImagesChange([...images, ...uploadedUrls]);
    } catch {
      toast.error("Tải ảnh thất bại, thử lại");
    } finally {
      setIsGalleryUploading(false);
      onUploadingChange?.(false);
    }
  }

  return (
    <Manager>
      <Section>
        <Label>Ảnh chính</Label>
        <MainRow>
          <div>
            {mainImage ? (
              <Thumbnail $size={120}>
                <Image
                  src={normalizeImageForDisplay(mainImage)}
                  alt={title || "Ảnh chính sản phẩm"}
                  fill
                  sizes="120px"
                  style={{ objectFit: "cover" }}
                />
                {isMainUploading ? <Spinner aria-label="Đang tải ảnh" /> : null}
              </Thumbnail>
            ) : (
              <EmptyThumbnail $size={120}>
                Chưa có ảnh
                {isMainUploading ? <Spinner aria-label="Đang tải ảnh" /> : null}
              </EmptyThumbnail>
            )}
            {mainImage ? <Filename title={getFilename(mainImage)}>{getFilename(mainImage)}</Filename> : null}
          </div>
          <ActionButton
            type="button"
            disabled={isUploading}
            onClick={() => mainInputRef.current?.click()}
          >
            Đổi ảnh
          </ActionButton>
        </MainRow>
        <HiddenInput
          ref={mainInputRef}
          type="file"
          accept="image/*"
          onChange={handleMainImage}
        />
      </Section>

      <Section>
        <Label>Ảnh phụ ({images.length}/8)</Label>
        <Gallery>
          {images.map((imageUrl, index) => (
            <Thumbnail $size={80} key={`${imageUrl}-${index}`}>
              <Image
                src={normalizeImageForDisplay(imageUrl)}
                alt={`${title || "Sản phẩm"} - ảnh phụ ${index + 1}`}
                fill
                sizes="80px"
                style={{ objectFit: "cover" }}
              />
              <DeleteButton
                type="button"
                aria-label={`Xóa ảnh phụ ${index + 1}`}
                onClick={() => onImagesChange(images.filter((_, imageIndex) => imageIndex !== index))}
              >
                ×
              </DeleteButton>
            </Thumbnail>
          ))}
          {images.length < 8 ? (
            <AddButton
              type="button"
              disabled={isUploading}
              onClick={() => galleryInputRef.current?.click()}
            >
              {isGalleryUploading ? <Spinner aria-label="Đang tải ảnh" /> : "Thêm ảnh"}
            </AddButton>
          ) : null}
        </Gallery>
        <HiddenInput
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleGalleryImages}
        />
      </Section>
    </Manager>
  );
}

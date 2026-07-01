import { describe, expect, it } from "vitest";
import {
  adminHomepageSliderSchema,
  toAdminHomepageSlide,
  toHomepageSlide,
} from "@/lib/adminHomepageSlider";

const validSlideInput = {
  imageUrl: "/images/homepage-slider/hero.webp",
  title: "Bộ sưu tập khủng long",
  subtitle: "Mở hộp mỗi ngày",
  eyebrow: "Ra mắt 2025",
  ctaLabel: "Mua ngay",
  ctaUrl: "/products",
  altText: "Mô hình khủng long",
  sortOrder: 1,
  isActive: true,
};

describe("adminHomepageSliderSchema", () => {
  it("accepts valid homepage slider input", () => {
    const result = adminHomepageSliderSchema.safeParse(validSlideInput);

    expect(result.success).toBe(true);
    expect(result.success ? result.data : null).toMatchObject(validSlideInput);
  });

  it("normalizes local image paths and empty CTA fields", () => {
    const result = adminHomepageSliderSchema.parse({
      ...validSlideInput,
      imageUrl: "images/homepage-slider/hero.webp",
      ctaLabel: "",
      ctaUrl: "",
    });

    expect(result.imageUrl).toBe("/images/homepage-slider/hero.webp");
    expect(result.ctaLabel).toBeNull();
    expect(result.ctaUrl).toBeNull();
  });

  it("accepts Vercel Blob image URLs from production uploads", () => {
    const blobUrl = "https://khunglongshop.public.blob.vercel-storage.com/images/homepage-slider/hero.webp";
    const result = adminHomepageSliderSchema.safeParse({
      ...validSlideInput,
      imageUrl: blobUrl,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.imageUrl).toBe(blobUrl);
    }
  });

  it("rejects missing required slide fields", () => {
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        imageUrl: "",
      }).success
    ).toBe(false);
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        title: "",
      }).success
    ).toBe(false);
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        altText: "",
      }).success
    ).toBe(false);
  });

  it("rejects invalid CTA pairs and external URLs", () => {
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        ctaLabel: "Mua ngay",
        ctaUrl: "",
      }).success
    ).toBe(false);
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        ctaLabel: "",
        ctaUrl: "/products",
      }).success
    ).toBe(false);
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        ctaUrl: "https://example.com",
      }).success
    ).toBe(false);
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        ctaUrl: "//example.com",
      }).success
    ).toBe(false);
    expect(
      adminHomepageSliderSchema.safeParse({
        ...validSlideInput,
        ctaUrl: "/javascript:alert(1)",
      }).success
    ).toBe(false);
  });

  it("requires a boolean active flag instead of coercing string false", () => {
    const result = adminHomepageSliderSchema.safeParse({
      ...validSlideInput,
      isActive: "false",
    });

    expect(result.success).toBe(false);
  });
});

describe("homepage slider mappers", () => {
  it("preserves public slide fields and serializes admin dates", () => {
    const record = {
      id: "slide-1",
      imageUrl: "/images/homepage-slider/hero.webp",
      title: "Slide 1",
      subtitle: null,
      eyebrow: "CMS",
      ctaLabel: "Xem ngay",
      ctaUrl: "/products",
      altText: "Ảnh slide",
      sortOrder: 2,
      isActive: true,
      createdAt: new Date("2026-06-12T00:00:00.000Z"),
      updatedAt: "2026-06-12T01:00:00.000Z",
    };

    expect(toHomepageSlide(record)).toEqual({
      id: "slide-1",
      imageUrl: "/images/homepage-slider/hero.webp",
      title: "Slide 1",
      subtitle: null,
      eyebrow: "CMS",
      ctaLabel: "Xem ngay",
      ctaUrl: "/products",
      altText: "Ảnh slide",
      sortOrder: 2,
      isActive: true,
    });
    expect(toAdminHomepageSlide(record)).toMatchObject({
      createdAt: "2026-06-12T00:00:00.000Z",
      updatedAt: "2026-06-12T01:00:00.000Z",
    });
  });
});

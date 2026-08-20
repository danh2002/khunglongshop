"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties } from "react";

const PRODUCT_IMAGE_FALLBACK = "/images/logo.png";

type ProductCardImageProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  style?: CSSProperties;
};

export default function ProductCardImage({
  src,
  alt,
  sizes,
  priority,
  loading,
  fetchPriority,
  style,
}: ProductCardImageProps) {
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    setDisplaySrc(src);
  }, [src]);

  return (
    <Image
      src={displaySrc}
      alt={alt}
      fill
      sizes={sizes}
      priority={priority}
      loading={loading}
      fetchPriority={fetchPriority}
      style={style}
      onError={() => {
        if (displaySrc !== PRODUCT_IMAGE_FALLBACK) {
          setDisplaySrc(PRODUCT_IMAGE_FALLBACK);
        }
      }}
    />
  );
}

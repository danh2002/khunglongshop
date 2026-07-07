"use client";

import toast from "react-hot-toast";
import { useProductStore } from "@/app/_zustand/store";

type ProductQuickAddProps = {
  available: boolean;
  product: {
    id: string;
    title: string;
    price: number;
    image: string;
    slug: string;
  };
};

export default function ProductQuickAdd({ available, product }: ProductQuickAddProps) {
  const addToCart = useProductStore((state) => state.addToCart);

  const handleAdd = () => {
    if (!available) return;
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      image: product.image,
      amount: 1,
      slug: product.slug,
    });
    toast.success("Đã thêm vào giỏ hàng");
  };

  return (
    <button className="product-quick-add" type="button" onClick={handleAdd} disabled={!available}>
      {available ? "Thêm vào giỏ" : "Hết hàng"}
    </button>
  );
}

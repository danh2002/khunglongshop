"use client";

import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import WishItem from "@/components/WishItem";
import { normalizeWishlistResponse } from "@/lib/wishlist";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export const WishlistModule = () => {
  const { data: session, status } = useSession();
  const { wishlist, setWishlist, removeFromWishlist } = useWishlistStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user?.id) {
      setWishlist([]);
      setLoading(false);
      return;
    }

    const loadWishlist = async () => {
      try {
        const response = await fetch("/api/wishlist", { cache: "no-store" });
        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          console.error("Không thể tải danh sách yêu thích:", payload);
          setWishlist([]);
          return;
        }

        const items = normalizeWishlistResponse(payload);
        setWishlist(
          items
            .filter((item) => item?.product)
            .map((item) => ({
              id: item.product.id,
              title: item.product.title,
              price: item.product.price,
              image: item.product.mainImage,
              slug: item.product.slug,
              stockAvailabillity: item.product.inStock,
            }))
        );
      } catch (error) {
        console.error("Không thể tải danh sách yêu thích:", error);
        setWishlist([]);
      } finally {
        setLoading(false);
      }
    };

    loadWishlist();
  }, [session?.user?.id, setWishlist, status]);

  const removeItem = async (productId: string) => {
    if (!session?.user?.id) return;

    const response = await fetch(`/api/wishlist/${productId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      removeFromWishlist(productId);
    }
  };

  if (loading) {
    return <p className="py-10 text-center text-white">Đang tải...</p>;
  }

  if (wishlist.length === 0) {
    return (
      <h3 className="py-10 text-center text-4xl text-white max-lg:text-3xl max-sm:pt-5 max-sm:text-2xl max-[400px]:text-xl">
        Chưa có sản phẩm yêu thích
      </h3>
    );
  }

  return (
    <div className="mx-auto max-w-screen-2xl">
      <div className="overflow-x-auto">
        <table className="table text-center text-white">
          <thead>
            <tr>
              <th></th>
              <th className="text-white">Hình ảnh</th>
              <th className="text-white">Tên sản phẩm</th>
              <th className="text-white">Tình trạng</th>
              <th className="text-white">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {wishlist.map((item) => (
              <WishItem
                id={item.id}
                title={item.title}
                price={item.price}
                image={item.image}
                slug={item.slug}
                stockAvailabillity={item.stockAvailabillity}
                onRemove={removeItem}
                key={item.id}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

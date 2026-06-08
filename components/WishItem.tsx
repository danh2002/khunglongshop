"use client";

import Image from "next/image";
import Link from "next/link";
import { FaTrashCan } from "react-icons/fa6";
import { useWishlistStore } from "@/app/_zustand/wishlistStore";
import { sanitize } from "@/lib/sanitize";

type WishItemProps = {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailabillity: number;
};

const WishItem = ({ id, title, price, image, slug, stockAvailabillity }: WishItemProps) => {
  const { removeFromWishlist } = useWishlistStore();

  return (
    <tr className="text-white">
      <td>
        <button
          type="button"
          onClick={() => removeFromWishlist(id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
          aria-label={`Remove ${sanitize(title)} from wishlist`}
        >
          <FaTrashCan />
        </button>
      </td>
      <td>
        <Link href={`/product/${slug}`} className="inline-block">
          <Image
            src={image ? `/${image}` : "/images/logo.png"}
            width={72}
            height={72}
            alt={sanitize(title) || "Wishlist item"}
            className="h-[72px] w-[72px] object-contain"
          />
        </Link>
      </td>
      <td>
        <Link href={`/product/${slug}`} className="font-bold text-white hover:text-orange-500">
          {sanitize(title)}
        </Link>
        <p className="text-sm text-orange-500">${price}</p>
      </td>
      <td>{stockAvailabillity > 0 ? "Còn hàng" : "Hết hàng"}</td>
      <td>
        <Link href={`/product/${slug}`} className="font-bold text-orange-500 hover:underline">
          Xem sản phẩm
        </Link>
      </td>
    </tr>
  );
};

export default WishItem;

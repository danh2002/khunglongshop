"use client";

import Image from "next/image";
import Link from "next/link";
import { FaTrashCan } from "react-icons/fa6";
import { sanitize } from "@/lib/sanitize";
import { formatVnd } from "@/lib/currency";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

type WishItemProps = {
  id: string;
  title: string;
  price: number;
  image: string;
  slug: string;
  stockAvailabillity: number;
  onRemove: (id: string) => void | Promise<void>;
};

const WishItem = ({ id, title, price, image, slug, stockAvailabillity, onRemove }: WishItemProps) => {
  return (
    <tr className="text-white">
      <td>
        <button
          type="button"
          onClick={() => onRemove(id)}
          className="inline-flex h-9 w-9 items-center justify-center rounded bg-red-600 text-white hover:bg-red-700"
          aria-label={`Xóa ${sanitize(title)} khỏi danh sách yêu thích`}
        >
          <FaTrashCan />
        </button>
      </td>
      <td>
        <Link href={`/product/${slug}`} className="inline-block">
          <Image
            src={normalizeCatalogImage(image || "/images/logo.png")}
            width={72}
            height={72}
            alt={sanitize(title) || "Sản phẩm yêu thích"}
            className="h-[72px] w-[72px] object-contain"
          />
        </Link>
      </td>
      <td>
        <Link href={`/product/${slug}`} className="font-bold text-white hover:text-orange-500">
          {sanitize(title)}
        </Link>
        <p className="text-sm text-orange-500">{formatVnd(price)}</p>
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

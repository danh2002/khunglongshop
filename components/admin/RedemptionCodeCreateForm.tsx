"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  adminInputClass,
  adminSecondaryButtonClass,
} from "@/components/admin/AdminUi";

type ProductOption = {
  id: string;
  title: string;
  setSlotNumber: number | null;
  set: { id: string; name: string } | null;
};

type CreatedCode = {
  id: string;
  code: string;
};

type ProductsResponse = {
  items: ProductOption[];
  pagination: {
    page: number;
    totalPages: number;
  };
};

export default function RedemptionCodeCreateForm() {
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState(10);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdCodes, setCreatedCodes] = useState<CreatedCode[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoadingProducts(true);
      try {
        const params = new URLSearchParams({
          collectorOnly: "true",
          page: String(page),
          limit: "20",
        });
        if (search.trim()) params.set("search", search.trim());

        const response = await fetch(`/api/admin/products?${params.toString()}`, {
          cache: "no-store",
        });
        const payload = (await response.json().catch(() => null)) as ProductsResponse | null;
        if (!response.ok || !payload) throw new Error("Unable to load products");
        if (cancelled) return;

        setProducts(payload.items ?? []);
        setTotalPages(payload.pagination?.totalPages ?? 1);
        if (!productId && payload.items?.[0]) {
          setProductId(payload.items[0].id);
        }
      } catch (error) {
        if (!cancelled) toast.error("Không tải được danh sách collector product.");
      } finally {
        if (!cancelled) setIsLoadingProducts(false);
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [page, productId, search]);

  const createdCodeText = useMemo(
    () => createdCodes.map((item) => item.code).join("\n"),
    [createdCodes]
  );

  async function createCodes() {
    if (!productId) {
      toast.error("Chọn một collector product trước khi tạo code.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/admin/redemption-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(payload?.error?.message ?? "Không thể tạo code.");
        return;
      }

      setCreatedCodes(payload.items ?? []);
      toast.success(`Đã tạo ${payload.items?.length ?? 0} code.`);
    } catch (error) {
      toast.error("Không thể tạo code lúc này.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function copyCodes() {
    if (!createdCodeText) return;
    if (!navigator.clipboard?.writeText) {
      toast.error("Clipboard không khả dụng. Hãy copy thủ công từ ô bên dưới.");
      return;
    }

    try {
      await navigator.clipboard.writeText(createdCodeText);
      toast.success("Đã copy code.");
    } catch (error) {
      toast.error("Không copy tự động được. Hãy copy thủ công từ ô bên dưới.");
    }
  }

  return (
    <section className="mb-6 border border-white/10 bg-[#0f0f0f] p-4">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-black uppercase text-white">Tạo code collector</h2>
          <p className="mt-1 text-xs text-white/45">
            Tạo code cho một sản phẩm. Muốn tạo cho nhiều sản phẩm thì lặp lại thao tác này.
          </p>
        </div>
        {createdCodes.length ? (
          <button className={adminSecondaryButtonClass} type="button" onClick={copyCodes}>
            Copy code
          </button>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(180px,260px)_minmax(260px,1fr)_120px_auto]">
        <input
          className={adminInputClass}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
          placeholder="Tìm product"
        />
        <select
          className={adminInputClass}
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          disabled={isLoadingProducts}
        >
          {products.length ? null : <option value="">Không có collector product</option>}
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.title} {product.set ? `- ${product.set.name} / slot ${product.setSlotNumber}` : ""}
            </option>
          ))}
        </select>
        <input
          className={adminInputClass}
          min={1}
          max={500}
          type="number"
          value={quantity}
          onChange={(event) => setQuantity(Number(event.target.value))}
        />
        <button
          className={adminSecondaryButtonClass}
          disabled={isSubmitting || isLoadingProducts}
          type="button"
          onClick={createCodes}
        >
          {isSubmitting ? "Đang tạo" : "Tạo code"}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-white/45">
        <button
          className="font-bold text-[#e85d00] disabled:text-white/25"
          disabled={page <= 1}
          type="button"
          onClick={() => setPage((current) => Math.max(current - 1, 1))}
        >
          Trang trước
        </button>
        <span>
          Trang {page}/{totalPages}
        </span>
        <button
          className="font-bold text-[#e85d00] disabled:text-white/25"
          disabled={page >= totalPages}
          type="button"
          onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
        >
          Trang sau
        </button>
      </div>

      {createdCodes.length ? (
        <textarea
          className={`${adminInputClass} mt-4 min-h-40 w-full resize-y font-mono leading-6`}
          readOnly
          value={createdCodeText}
          aria-label="Code vừa tạo"
        />
      ) : null}
    </section>
  );
}

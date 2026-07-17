"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminTd,
  AdminTh,
  adminInputClass,
  adminSecondaryButtonClass,
} from "@/components/admin/AdminUi";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

type FeaturedProductItem = {
  id: string;
  productId: string;
  sortOrder: number;
  product: {
    id: string;
    slug: string;
    title: string;
    mainImage: string;
    isVisible: boolean;
    isCollector: boolean;
    isBlindBox: boolean;
    setId: string | null;
    setSlotNumber: number | null;
    set?: { id: string; name: string } | null;
  };
};

type CandidateProduct = {
  id: string;
  title: string;
  mainImage: string;
  isVisible: boolean;
  isCollector: boolean;
  isBlindBox: boolean;
  setId: string | null;
  setSlotNumber: number | null;
  set?: { id: string; name: string } | null;
};

function formatSlot(product: FeaturedProductItem["product"] | CandidateProduct) {
  const setName = product.set?.name ?? "Bộ sưu tập";
  const slot = product.setSlotNumber ? `slot ${product.setSlotNumber}` : "chưa có slot";
  return `${setName} / ${slot}`;
}

export default function AdminFeaturedProductsPage() {
  const [items, setItems] = useState<FeaturedProductItem[]>([]);
  const [candidates, setCandidates] = useState<CandidateProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSetId, setSelectedSetId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadFeaturedProducts = useCallback(async () => {
    const response = await fetch("/api/admin/featured-products", { cache: "no-store" });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error?.message || "Không thể tải sản phẩm nổi bật.");
    }

    setItems(Array.isArray(payload?.items) ? payload.items : []);
  }, []);

  const loadCandidateProducts = useCallback(async () => {
    const response = await fetch("/api/admin/products?collectorOnly=true&limit=500", {
      cache: "no-store",
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(payload?.error?.message || "Không thể tải sản phẩm collector.");
    }

    setCandidates(Array.isArray(payload?.items) ? payload.items : []);
  }, []);

  const refreshData = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([loadFeaturedProducts(), loadCandidateProducts()]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể tải dữ liệu.");
    } finally {
      setIsLoading(false);
    }
  }, [loadCandidateProducts, loadFeaturedProducts]);

  useEffect(() => {
    void refreshData();
  }, [refreshData]);

  useEffect(() => {
    setSelectedProductId("");
  }, [selectedSetId]);

  const featuredProductIds = useMemo(
    () => new Set(items.map((item) => item.productId)),
    [items]
  );

  const availableSets = useMemo(() => {
    const seen = new Map<string, { id: string; name: string }>();
    for (const product of candidates) {
      if (product.set && !seen.has(product.set.id)) {
        seen.set(product.set.id, product.set);
      }
    }
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates]);

  const availableCandidates = useMemo(() => {
    return candidates.filter((product) => {
      if (featuredProductIds.has(product.id)) return false;
      if (!product.isVisible || !product.isCollector || product.isBlindBox) return false;
      if (!product.setId || !product.setSlotNumber) return false;
      if (!selectedSetId) return true;
      return product.set?.id === selectedSetId;
    });
  }, [candidates, featuredProductIds, selectedSetId]);

  async function addFeaturedProduct() {
    if (!selectedProductId) {
      toast.error("Vui lòng chọn sản phẩm.");
      return;
    }

    setIsSaving(true);
    const response = await fetch("/api/admin/featured-products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedProductId }),
    });
    const payload = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      toast.error(payload?.error?.message || "Không thể thêm sản phẩm.");
      return;
    }

    toast.success("Đã thêm sản phẩm nổi bật.");
    setSelectedProductId("");
    await refreshData();
  }

  async function removeFeaturedProduct(productId: string) {
    setIsSaving(true);
    const response = await fetch(`/api/admin/featured-products/${encodeURIComponent(productId)}`, {
      method: "DELETE",
    });
    const payload = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      toast.error(payload?.error?.message || "Không thể xóa sản phẩm.");
      return;
    }

    toast.success("Đã xóa khỏi danh sách nổi bật.");
    await refreshData();
  }

  async function reorder(nextItems: FeaturedProductItem[]) {
    setItems(nextItems.map((item, index) => ({ ...item, sortOrder: index })));
    setIsSaving(true);
    const response = await fetch("/api/admin/featured-products/reorder", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productIds: nextItems.map((item) => item.productId) }),
    });
    const payload = await response.json().catch(() => null);
    setIsSaving(false);

    if (!response.ok) {
      toast.error(payload?.error?.message || "Không thể sắp xếp sản phẩm.");
      await refreshData();
      return;
    }

    toast.success("Đã cập nhật thứ tự.");
  }

  function moveItem(index: number, direction: -1 | 1) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;

    const nextItems = [...items];
    const [item] = nextItems.splice(index, 1);
    nextItems.splice(nextIndex, 0, item);
    void reorder(nextItems);
  }

  return (
    <AdminPage className="bg-[#0a0a0a]">
      <AdminPageHeader
        title="Sản phẩm nổi bật"
        description="Chọn móc khoá collector hiển thị ở các section đầu trang chủ."
      />

      <section className="mb-6 border border-white/10 bg-[#0f0f0f] p-4">
        <h2 className="text-sm font-black uppercase text-white">Thêm sản phẩm</h2>
        <p className="mt-1 text-sm text-white/50">
          Chỉ sản phẩm collector đang hiển thị và có bộ/slot mới có thể đưa lên trang chủ.
        </p>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(180px,260px)_minmax(260px,1fr)_auto]">
          <select
            className={adminInputClass}
            value={selectedSetId}
            onChange={(event) => setSelectedSetId(event.target.value)}
          >
            <option value="">Tất cả nhân vật</option>
            {availableSets.map((set) => (
              <option key={set.id} value={set.id}>
                {set.name}
              </option>
            ))}
          </select>
          <select
            className={adminInputClass}
            value={selectedProductId}
            onChange={(event) => setSelectedProductId(event.target.value)}
          >
            <option value="">Chọn sản phẩm</option>
            {availableCandidates.map((product) => (
              <option key={product.id} value={product.id}>
                {product.title} - {formatSlot(product)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="min-h-10 bg-[#e85d00] px-5 text-sm font-black uppercase text-white disabled:opacity-50"
            disabled={isSaving || !selectedProductId}
            onClick={addFeaturedProduct}
          >
            Thêm sản phẩm
          </button>
        </div>
      </section>

      {isLoading ? (
        <AdminEmptyState>Đang tải sản phẩm nổi bật...</AdminEmptyState>
      ) : items.length === 0 ? (
        <AdminEmptyState>Chưa có sản phẩm nổi bật.</AdminEmptyState>
      ) : (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Thứ tự</AdminTh>
              <AdminTh>Sản phẩm</AdminTh>
              <AdminTh>Bộ / slot</AdminTh>
              <AdminTh>Điều khiển</AdminTh>
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => (
              <tr key={item.id}>
                <AdminTd>#{index + 1}</AdminTd>
                <AdminTd>
                  <div className="flex items-center gap-3">
                    <div className="relative h-14 w-14 overflow-hidden border border-white/10 bg-black">
                      <Image
                        src={normalizeCatalogImage(item.product.mainImage)}
                        alt={item.product.title}
                        fill
                        sizes="56px"
                        style={{ objectFit: "contain" }}
                      />
                    </div>
                    <div>
                      <p className="font-bold text-white">{item.product.title}</p>
                      <p className="text-xs text-white/45">{item.product.slug}</p>
                    </div>
                  </div>
                </AdminTd>
                <AdminTd>{formatSlot(item.product)}</AdminTd>
                <AdminTd>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={adminSecondaryButtonClass}
                      disabled={isSaving || index === 0}
                      onClick={() => moveItem(index, -1)}
                    >
                      Lên
                    </button>
                    <button
                      type="button"
                      className={adminSecondaryButtonClass}
                      disabled={isSaving || index === items.length - 1}
                      onClick={() => moveItem(index, 1)}
                    >
                      Xuống
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-10 items-center justify-center border border-red-500/50 bg-red-500/10 px-4 text-sm font-bold uppercase text-red-200 transition hover:bg-red-500/20"
                      disabled={isSaving}
                      onClick={() => removeFeaturedProduct(item.productId)}
                    >
                      Xóa
                    </button>
                  </div>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      )}
    </AdminPage>
  );
}

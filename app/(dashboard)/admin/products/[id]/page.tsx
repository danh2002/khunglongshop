"use client";

import AdminProductForm, { ProductFormValues, ProductReferenceData } from "@/components/AdminProductForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ProductDetail = ProductFormValues & {
  id: string;
  dependencyCounts: Record<string, number>;
};

interface DashboardProductDetailsProps {
  params: Promise<{ id: string }>;
}

const emptyReferences: ProductReferenceData = {
  categories: [],
  merchants: [],
  collectorSets: [],
};

export default function DashboardProductDetails({ params }: DashboardProductDetailsProps) {
  const { id } = use(params);
  const router = useRouter();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [references, setReferences] = useState<ProductReferenceData>(emptyReferences);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const dependencySummary = useMemo(() => {
    if (!product?.dependencyCounts) return [];
    return Object.entries(product.dependencyCounts).filter(([, count]) => count > 0);
  }, [product]);

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      setIsLoading(true);
      try {
        const [productResponse, referencesResponse] = await Promise.all([
          fetch(`/api/admin/products/${id}`, { cache: "no-store" }),
          fetch("/api/admin/products/reference-data", { cache: "no-store" }),
        ]);

        if (!productResponse.ok || !referencesResponse.ok) throw new Error("Failed to load product");

        const productPayload = (await productResponse.json()) as ProductDetail;
        const referencesPayload = (await referencesResponse.json()) as ProductReferenceData;

        if (mounted) {
          setProduct(productPayload);
          setReferences(referencesPayload);
        }
      } catch (error) {
        if (mounted) toast.error("Không thể tải sản phẩm");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadProduct();
    return () => {
      mounted = false;
    };
  }, [id]);

  async function updateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!product) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/admin/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(payload?.error?.message || "Không thể cập nhật sản phẩm");
        return;
      }

      toast.success("Đã cập nhật sản phẩm");
      setProduct((current) => (current ? { ...current, ...payload } : current));
    } catch (error) {
      toast.error("Không thể cập nhật sản phẩm");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProduct() {
    if (!product) return;
    if (!window.confirm(`Xóa sản phẩm ${product.title}? Hành động này không thể hoàn tác.`)) return;

    const response = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });

    if (response.status === 204) {
      toast.success("Đã xóa sản phẩm");
      router.push("/admin/products");
      return;
    }

    const payload = await response.json().catch(() => null);
    toast.error(payload?.error?.message || "Không thể xóa sản phẩm");
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex max-w-screen-2xl max-xl:flex-col">
        <section className="w-full px-5 py-6">
          <div className="mb-6">
            <Link href="/admin/products" className="text-sm font-black uppercase text-[#e85d00]">
              Quay lại danh sách
            </Link>
            <h1 className="mt-3 text-3xl font-black uppercase italic">Chi tiết sản phẩm</h1>
          </div>

          {isLoading ? (
            <div className="border border-[#e85d00]/25 bg-white/[0.03] p-6 text-white/60">Đang tải...</div>
          ) : !product ? (
            <div className="border border-[#e85d00]/25 bg-white/[0.03] p-6 text-white/60">Không tìm thấy sản phẩm</div>
          ) : (
            <div className="grid gap-5 xl:grid-cols-[minmax(0,760px)_minmax(280px,360px)]">
              <AdminProductForm
                value={product}
                references={references}
                currentProductId={product.id}
                isSaving={isSaving}
                submitLabel="Lưu thay đổi"
                onChange={(value) => setProduct((current) => (current ? { ...current, ...value } : current))}
                onSubmit={updateProduct}
              />
              <aside className="border border-[#e85d00]/25 bg-white/[0.03] p-5">
                <h2 className="text-lg font-black uppercase italic">Bảo vệ dữ liệu</h2>
                <div className="mt-4 grid gap-2 text-sm text-white/70">
                  {dependencySummary.length > 0 ? (
                    <>
                      <p className="font-bold text-[#e85d00]">Sản phẩm còn dữ liệu liên quan:</p>
                      {dependencySummary.map(([key, count]) => (
                        <p key={key}>{key}: {count}</p>
                      ))}
                    </>
                  ) : (
                    <p className="text-green-300">Chưa có lịch sử bảo vệ.</p>
                  )}
                  {product.setId ? <p className="text-[#e85d00]">Sản phẩm đang nằm trong bộ sưu tập nên không thể xóa trực tiếp.</p> : null}
                </div>
                <button type="button" onClick={deleteProduct} className="mt-5 min-h-12 border border-red-500 px-5 font-black uppercase text-red-300 hover:bg-red-500 hover:text-white">
                  Xóa sản phẩm
                </button>
              </aside>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

"use client";

import AdminProductForm, { ProductFormValues, ProductReferenceData } from "@/components/AdminProductForm";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import toast from "react-hot-toast";

const emptyProduct: ProductFormValues = {
  title: "",
  slug: "",
  mainImage: "/images/mk1.png",
  images: [],
  price: 0,
  rating: 5,
  description: "",
  manufacturer: "Khung Long Shop",
  inStock: 1,
  categoryId: "",
  merchantId: "",
  isCollector: false,
  isVisible: false,
  setId: null,
  setSlotNumber: null,
  isBlindBox: false,
  blindBoxSetId: null,
};

const emptyReferences: ProductReferenceData = {
  categories: [],
  merchants: [],
  collectorSets: [],
};

export default function AddNewProduct() {
  const router = useRouter();
  const [product, setProduct] = useState<ProductFormValues>(emptyProduct);
  const [references, setReferences] = useState<ProductReferenceData>(emptyReferences);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadReferences() {
      try {
        const response = await fetch("/api/admin/products/reference-data", { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load references");
        const payload = (await response.json()) as ProductReferenceData;
        setReferences(payload);
        setProduct((current) => ({
          ...current,
          categoryId: current.categoryId || payload.categories[0]?.id || "",
          merchantId: current.merchantId || payload.merchants[0]?.id || "",
        }));
      } catch (error) {
        toast.error("Không thể tải dữ liệu tham chiếu");
      }
    }

    loadReferences();
  }, []);

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(product),
      });
      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        toast.error(payload?.error?.message || "Không thể tạo sản phẩm");
        return;
      }

      toast.success("Đã tạo sản phẩm");
      router.push(`/admin/products/${payload.id}`);
    } catch (error) {
      toast.error("Không thể tạo sản phẩm");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex max-w-screen-2xl max-xl:flex-col">
        <section className="w-full px-5 py-6">
          <div className="mb-6">
            <Link href="/admin/products" className="text-sm font-black uppercase text-[#e85d00]">
              Quay lại danh sách
            </Link>
            <h1 className="mt-3 text-3xl font-black uppercase italic">Thêm sản phẩm</h1>
          </div>
          <AdminProductForm value={product} references={references} isSaving={isSaving} submitLabel="Tạo sản phẩm" onChange={setProduct} onSubmit={createProduct} />
        </section>
      </div>
    </main>
  );
}

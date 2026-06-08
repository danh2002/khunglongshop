"use client";

import { normalizeImageForDisplay } from "@/lib/adminProduct";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

type ProductListItem = {
  id: string;
  slug: string;
  title: string;
  mainImage: string;
  price: number;
  inStock: number;
  isCollector: boolean;
  setSlotNumber: number | null;
  category: { id: string; name: string };
  merchant: { id: string; name: string };
  set: { id: string; name: string } | null;
};

type ProductsResponse = {
  items: ProductListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
};

export default function DashboardProducts() {
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [search, setSearch] = useState("");
  const [stock, setStock] = useState("all");
  const [collector, setCollector] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), limit: "20" });
    if (search.trim()) params.set("search", search.trim());
    if (stock !== "all") params.set("stock", stock);
    if (collector) params.set("isCollector", collector);
    return params.toString();
  }, [collector, page, search, stock]);

  useEffect(() => {
    let mounted = true;

    async function loadProducts() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/products?${query}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Failed to load products");
        const payload = (await response.json()) as ProductsResponse;
        if (mounted) {
          setProducts(payload.items);
          setTotalPages(payload.pagination.totalPages);
        }
      } catch (error) {
        if (mounted) toast.error("Không thể tải sản phẩm");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadProducts();
    return () => {
      mounted = false;
    };
  }, [query]);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto flex max-w-screen-2xl max-xl:flex-col">
        <section className="w-full px-5 py-6">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-[#e85d00]">CMS</p>
              <h1 className="mt-2 text-3xl font-black uppercase italic">Sản phẩm</h1>
            </div>
            <Link
              href="/admin/products/new"
              className="inline-flex min-h-12 items-center border border-[#e85d00] bg-[#e85d00] px-5 text-sm font-black uppercase text-white hover:bg-[#ff7417]"
            >
              Thêm sản phẩm
            </Link>
          </div>

          <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,360px)_180px_180px]">
            <input
              value={search}
              onChange={(event) => {
                setPage(1);
                setSearch(event.target.value);
              }}
              placeholder="Tìm title hoặc slug..."
              className="min-h-12 border border-[#e85d00]/40 bg-white/5 px-4 text-white outline-none focus:border-[#e85d00]"
            />
            <select
              value={stock}
              onChange={(event) => {
                setPage(1);
                setStock(event.target.value);
              }}
              className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none"
            >
              <option value="all">Tất cả tồn kho</option>
              <option value="in-stock">Còn hàng</option>
              <option value="out-of-stock">Hết hàng</option>
            </select>
            <select
              value={collector}
              onChange={(event) => {
                setPage(1);
                setCollector(event.target.value);
              }}
              className="min-h-12 border border-[#e85d00]/40 bg-[#111] px-4 text-white outline-none"
            >
              <option value="">Tất cả loại</option>
              <option value="true">Sưu tập</option>
              <option value="false">Thường</option>
            </select>
          </div>

          <div className="overflow-auto border border-[#e85d00]/25 bg-white/[0.03]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-[#e85d00] text-xs uppercase text-white">
                <tr>
                  <th className="px-4 py-3">Sản phẩm</th>
                  <th className="px-4 py-3">Giá</th>
                  <th className="px-4 py-3">Tồn kho</th>
                  <th className="px-4 py-3">Danh mục</th>
                  <th className="px-4 py-3">Merchant</th>
                  <th className="px-4 py-3">Bộ sưu tập</th>
                  <th className="px-4 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr><td className="px-4 py-8 text-center text-white/60" colSpan={7}>Đang tải...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td className="px-4 py-8 text-center text-white/60" colSpan={7}>Không tìm thấy dữ liệu phù hợp</td></tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} className="border-t border-white/10">
                      <td className="px-4 py-4">
                        <div className="flex min-w-[260px] items-center gap-3">
                          <div className="relative h-12 w-12 overflow-hidden bg-white/5">
                            <Image src={normalizeImageForDisplay(product.mainImage)} alt={product.title} fill sizes="48px" style={{ objectFit: "cover" }} />
                          </div>
                          <div>
                            <p className="font-black text-white">{product.title}</p>
                            <p className="text-xs text-white/45">{product.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">{product.price.toLocaleString("vi-VN")}đ</td>
                      <td className="px-4 py-4">{product.inStock}</td>
                      <td className="px-4 py-4">{product.category?.name}</td>
                      <td className="px-4 py-4">{product.merchant?.name}</td>
                      <td className="px-4 py-4">
                        {product.set ? `${product.set.name} #${product.setSlotNumber}` : product.isCollector ? "Chưa gán" : "-"}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link href={`/admin/products/${product.id}`} className="font-black uppercase text-[#e85d00]">Chi tiết</Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-5 flex items-center justify-end gap-3">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="min-h-10 border border-white/20 px-4 font-bold uppercase text-white disabled:opacity-40">Trước</button>
            <span className="text-sm text-white/70">Trang {page}/{totalPages}</span>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))} className="min-h-10 border border-white/20 px-4 font-bold uppercase text-white disabled:opacity-40">Sau</button>
          </div>
        </section>
      </div>
    </main>
  );
}

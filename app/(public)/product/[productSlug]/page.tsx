import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ProductTabs,
  SingleProductDynamicFields,
  StockAvailabillity,
} from "@/components";
import { formatVnd } from "@/lib/currency";
import {
  buildPublicProductDetailWhere,
  normalizeCatalogImage,
} from "@/lib/publicCatalog";
import { sanitize } from "@/lib/sanitize";
import prisma from "@/utils/db";

export const revalidate = 60;

export default async function SingleProductPage({
  params,
}: {
  params: Promise<{ productSlug: string }>;
}) {
  const { productSlug } = await params;

  const product = await prisma.product.findFirst({
    where: buildPublicProductDetailWhere(productSlug),
    include: {
      category: { select: { name: true } },
      set: { select: { id: true, name: true, totalSlots: true } },
    },
  });

  if (!product) notFound();

  const rawImages: string[] = (() => {
    try { return JSON.parse(product.images) as string[]; }
    catch { return []; }
  })();
  const collectionName = product.set?.name ?? "Bộ sưu tập";
  const availableVariantCount = rawImages.length;
  const isCollectorProduct = Boolean(product.isCollector);

  return (
    <main className="min-h-screen bg-[#070707] text-white">
      <section className="mx-auto grid max-w-screen-xl gap-10 px-5 py-12 lg:grid-cols-2">
        <div className="relative aspect-square overflow-hidden border border-orange-600/30 bg-[#111]">
          <Image
            src={normalizeCatalogImage(product.mainImage)}
            alt={sanitize(product.title)}
            fill
            priority
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-contain p-8"
          />
        </div>
        <div className="flex flex-col justify-center gap-6">
          <span className="w-fit bg-[#e85d00] px-3 py-1 text-xs font-black uppercase">
            {isCollectorProduct ? "Mẫu móc khóa" : "Túi mù"}
          </span>
          <h1 className="text-4xl font-black uppercase italic">
            {sanitize(product.title)}
          </h1>
          {!isCollectorProduct ? (
            <>
              <p className="text-2xl font-black text-[#e85d00]">
                {formatVnd(product.price)}
              </p>
              <StockAvailabillity stock={product.inStock} inStock={product.inStock} />
            </>
          ) : null}
          <p className="leading-7 text-white/65">
            {sanitize(product.description)}
          </p>
          {!isCollectorProduct ? <SingleProductDynamicFields product={product} /> : null}
        </div>
      </section>

      {rawImages.length > 0 ? (
        <section className="mx-auto max-w-screen-xl px-5 pb-16">
        <div className="border-t border-orange-600/25 pt-10">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-[#e85d00]">
            Bộ sưu tập {sanitize(collectionName)}
          </p>
          <h2 className="mt-2 text-3xl font-black uppercase italic">
            {availableVariantCount} mẫu {sanitize(collectionName)} có thể nhận
          </h2>
          <p className="mt-3 max-w-2xl text-white/55">
            Mỗi túi chứa ngẫu nhiên một mẫu. Độ hiếm được công bố theo cấp,
            không hiển thị trọng số quay.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {rawImages.map((url, index) => (
              <article
                key={url}
                className="overflow-hidden border border-white/10 bg-[#111]"
              >
                <div className="relative aspect-square bg-white/5">
                  <Image
                    src={normalizeCatalogImage(url)}
                    alt={`Mẫu số ${index + 1}`}
                    fill
                    sizes="(max-width: 640px) 50vw, 220px"
                    className="object-contain p-3"
                  />
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-white/45">
                    Mẫu {index + 1}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
        <div className="py-12">
          <ProductTabs product={product} />
        </div>
        </section>
      ) : null}
    </main>
  );
}

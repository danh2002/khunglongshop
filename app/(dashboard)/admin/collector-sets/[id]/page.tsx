import Image from "next/image";
import { notFound } from "next/navigation";
import BlindBoxPoolEditorClient from "./BlindBoxPoolEditorClient";
import { AdminMetric, AdminPage, AdminPageHeader } from "@/components/admin/AdminUi";
import CollectorSetMetadataForm from "@/components/admin/CollectorSetMetadataForm";
import prisma from "@/utils/db";

export default async function CollectorSetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const set = await prisma.collectorSet.findUnique({
    where: { id },
    include: {
      products: {
        orderBy: { setSlotNumber: "asc" },
        include: { _count: { select: { redemptionCodes: true } } },
      },
      _count: { select: { setRewards: true } },
    },
  });
  if (!set) notFound();
  const productBySlot = new Map(set.products.map((product) => [product.setSlotNumber, product]));
  return (
    <AdminPage>
      <AdminPageHeader title={set.name} description={set.description ?? "Bộ sưu tập 10 sản phẩm"} />
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <AdminMetric label="Đã gán" value={`${set.products.length}/${set.totalSlots}`} />
        <AdminMetric label="Người hoàn thành" value={set._count.setRewards} />
        <AdminMetric label="Phần thưởng" value={set.rewardDescription ?? "Chưa cấu hình"} />
      </section>
      <CollectorSetMetadataForm
        id={set.id}
        initialName={set.name}
        initialSlug={set.slug ?? ""}
        initialImage={set.image ?? ""}
        initialDescription={set.description ?? ""}
        initialHeroImage={set.heroImage ?? ""}
        initialHeroBadge={set.heroBadge ?? ""}
        initialHeroTitle={set.heroTitle ?? ""}
        initialHeroSubtitle={set.heroSubtitle ?? ""}
        initialHeroPrimaryCtaLabel={set.heroPrimaryCtaLabel ?? ""}
        initialHeroPrimaryCtaUrl={set.heroPrimaryCtaUrl ?? ""}
        initialHeroSecondaryCtaLabel={set.heroSecondaryCtaLabel ?? ""}
        initialHeroSecondaryCtaUrl={set.heroSecondaryCtaUrl ?? ""}
        initialShowHero={set.showHero}
      />
      <section className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-5">
        {Array.from({ length: 10 }, (_, index) => {
          const slotNumber = index + 1;
          const product = productBySlot.get(slotNumber);
          return (
            <div key={slotNumber} className="min-h-52 border border-white/10 bg-[#0f0f0f] p-3">
              <div className="mb-3 flex items-center justify-between text-xs font-black uppercase">
                <span className="text-[#e85d00]">Slot {slotNumber}</span>
                <span className="text-white/40">{product ? `${product._count.redemptionCodes} code` : "Trống"}</span>
              </div>
              {product ? (
                <>
                  <div className="relative aspect-square overflow-hidden bg-black">
                    <Image src={product.mainImage} alt={product.title} fill className="object-contain" sizes="200px" />
                  </div>
                  <p className="mt-3 text-sm font-bold">{product.title}</p>
                </>
              ) : <div className="flex aspect-square items-center justify-center border border-dashed border-white/15 text-sm text-white/30">Chưa gán</div>}
            </div>
          );
        })}
      </section>
      <BlindBoxPoolEditorClient collectorSetId={set.id} />
    </AdminPage>
  );
}

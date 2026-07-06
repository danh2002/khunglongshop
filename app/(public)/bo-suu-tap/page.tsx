import Image from "next/image";
import Link from "next/link";
import { Breadcrumb, Products } from "@/components";
import { SectionShell, Wrapper } from "@/components/design-system";
import { getCollectorSetHero } from "@/lib/collectorSetHero";

export const revalidate = 60;

type CollectionsPageProps = {
  searchParams: Promise<{
    category?: string;
    nhanvat?: string;
  }>;
};

export default async function CollectionsPage({ searchParams }: CollectionsPageProps) {
  const params = await searchParams;
  const characterHero = await getCollectorSetHero(params.nhanvat);

  return (
    <SectionShell>
      {characterHero ? (
        <section className="relative h-[420px] w-full overflow-hidden bg-[#070707] md:h-[580px]">
          <Image
            src={characterHero.image}
            alt={characterHero.title}
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectFit: "cover", objectPosition: "center" }}
          />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.75)_0%,rgba(0,0,0,0.66)_34%,rgba(0,0,0,0.16)_66%,rgba(0,0,0,0)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0)_62%,rgba(0,0,0,0.46)_100%)]" />
          <div className="absolute inset-0 z-10 flex px-6 md:px-[60px]">
            <div className="flex max-w-[620px] translate-y-[4%] flex-col items-start self-center text-left">
              <p className="mb-4 border-l-2 border-[#e85d00] pl-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#e85d00]">
                {characterHero.badge}
              </p>
              <h1 className="text-[clamp(2.5rem,5vw,4.5rem)] font-black uppercase leading-[1.1] text-white [text-shadow:0_2px_20px_rgba(0,0,0,0.5)]">
                {characterHero.title}
              </h1>
              {characterHero.subtitle ? (
                <p className="mt-2 text-[0.95rem] font-normal leading-7 tracking-[0.05em] text-white/70">
                  {characterHero.subtitle}
                </p>
              ) : null}
              {characterHero.primaryCta || characterHero.secondaryCta ? (
                <div className="mt-6 flex flex-wrap gap-3">
                  {characterHero.primaryCta ? (
                    <Link
                      href={characterHero.primaryCta.href}
                      className="inline-flex items-center justify-center rounded-[2px] bg-[#e85d00] px-8 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:bg-[#ff7518]"
                    >
                      {characterHero.primaryCta.label}
                    </Link>
                  ) : null}
                  {characterHero.secondaryCta ? (
                    <Link
                      href={characterHero.secondaryCta.href}
                      className="inline-flex items-center justify-center rounded-[2px] border border-white/50 bg-transparent px-8 py-3 text-xs font-bold uppercase tracking-[0.08em] text-white transition hover:border-white"
                    >
                      {characterHero.secondaryCta.label}
                    </Link>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      <Wrapper>
        {!characterHero ? (
          <>
            <Breadcrumb />
            <h1 className="text-2xl font-bold uppercase text-white">Bộ sưu tập</h1>
            <p className="mt-2 text-white/55">Khám phá sản phẩm theo danh mục và nhân vật.</p>
          </>
        ) : null}
        <div className="divider" />
        <div id="bo-suu-tap">
          <Products categorySlug={params.category} characterSlug={params.nhanvat} />
        </div>
      </Wrapper>
    </SectionShell>
  );
}

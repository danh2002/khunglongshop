export const revalidate = 60;

import Breadcrumb from "@/components/Breadcrumb";
import Products from "@/components/Products";
import { SectionShell, Wrapper } from "@/components/public-shell";

export function generateStaticParams() {
  return [{ slug: [] }];
}

export default function ShopPage() {
  return (
    <SectionShell>
      <Wrapper>
        <Breadcrumb />
        <h1 className="text-2xl font-bold uppercase italic text-white">
          Túi mù Vanie
        </h1>
        <p className="mt-2 text-white/55">
          Một sản phẩm, mười mẫu Vanie có thể nhận.
        </p>
        <div className="divider" />
        <Products />
      </Wrapper>
    </SectionShell>
  );
}

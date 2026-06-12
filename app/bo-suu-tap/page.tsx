import { Breadcrumb, Products } from "@/components";
import { SectionShell, Wrapper } from "@/components/design-system";

export const revalidate = 60;

export default function CollectionsPage() {
  return (
    <SectionShell>
      <Wrapper>
        <Breadcrumb />
        <h1 className="text-2xl font-bold uppercase text-white">Bộ sưu tập</h1>
        <p className="mt-2 text-white/55">Khám phá sản phẩm theo danh mục và nhân vật.</p>
        <div className="divider" />
        <Products />
      </Wrapper>
    </SectionShell>
  );
}

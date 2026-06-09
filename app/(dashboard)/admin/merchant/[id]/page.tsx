import { notFound } from "next/navigation";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminUi";
import MerchantForm from "@/components/admin/MerchantForm";
import prisma from "@/utils/db";

export default async function MerchantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const merchant = await prisma.merchant.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!merchant) notFound();
  return (
    <AdminPage>
      <AdminPageHeader title="Chi tiết merchant" />
      <MerchantForm
        id={merchant.id}
        productCount={merchant._count.products}
        initial={{
          name: merchant.name,
          email: merchant.email ?? "",
          phone: merchant.phone ?? "",
          address: merchant.address ?? "",
          description: merchant.description ?? "",
          status: merchant.status,
        }}
      />
    </AdminPage>
  );
}

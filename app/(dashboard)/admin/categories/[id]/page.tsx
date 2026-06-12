import { notFound } from "next/navigation";
import { AdminPage, AdminPageHeader } from "@/components/admin/AdminUi";
import CategoryForm from "@/components/admin/CategoryForm";
import prisma from "@/utils/db";

export default async function CategoryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const category = await prisma.category.findUnique({
    where: { id },
    include: { _count: { select: { products: true } } },
  });
  if (!category) notFound();
  return (
    <AdminPage>
      <AdminPageHeader title="Chi tiết danh mục" />
      <CategoryForm
        id={category.id}
        initialName={category.name}
        initialSlug={category.slug ?? ""}
        initialIcon={category.icon ?? ""}
        initialDescription={category.description ?? ""}
        productCount={category._count.products}
      />
    </AdminPage>
  );
}

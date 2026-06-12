import Link from "next/link";
import {
  AdminActionLink,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/AdminUi";
import prisma from "@/utils/db";

export default async function CategoriesPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <AdminPage>
      <AdminPageHeader
        title="Danh mục"
        description="Tên tiếng Việt được lưu nguyên bản; danh mục có sản phẩm không thể xóa."
        action={<AdminActionLink href="/admin/categories/new">Tạo danh mục</AdminActionLink>}
      />
      {categories.length ? (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Tên</AdminTh>
              <AdminTh>Slug</AdminTh>
              <AdminTh>Sản phẩm</AdminTh>
              <AdminTh />
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <AdminTd>{category.name}</AdminTd>
                <AdminTd>{category.slug ?? "Tự động"}</AdminTd>
                <AdminTd>{category._count.products}</AdminTd>
                <AdminTd>
                  <Link className="font-bold text-[#e85d00]" href={`/admin/categories/${category.id}`}>
                    Chỉnh sửa
                  </Link>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmptyState>Chưa có danh mục.</AdminEmptyState>
      )}
    </AdminPage>
  );
}

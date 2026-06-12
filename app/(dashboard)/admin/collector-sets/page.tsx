import Link from "next/link";
import {
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/AdminUi";
import CollectorSetCreateForm from "@/components/admin/CollectorSetCreateForm";
import prisma from "@/utils/db";

export default async function CollectorSetsPage() {
  const sets = await prisma.collectorSet.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true, setRewards: true } } },
  });
  return (
    <AdminPage>
      <AdminPageHeader
        title="Bộ sưu tập"
        description="Mỗi bộ có đúng 10 slot; bộ có lịch sử không thể xóa."
        action={<CollectorSetCreateForm />}
      />
      {sets.length ? (
        <AdminTable>
          <thead><tr><AdminTh>Tên</AdminTh><AdminTh>Slug</AdminTh><AdminTh>Đã gán</AdminTh><AdminTh>Hoàn thành</AdminTh><AdminTh>Ngày tạo</AdminTh><AdminTh /></tr></thead>
          <tbody>
            {sets.map((set) => (
              <tr key={set.id}>
                <AdminTd>{set.name}</AdminTd>
                <AdminTd>{set.slug ?? "Tự động"}</AdminTd>
                <AdminTd>{set._count.products}/{set.totalSlots}</AdminTd>
                <AdminTd>{set._count.setRewards} người dùng</AdminTd>
                <AdminTd>{set.createdAt.toLocaleDateString("vi-VN")}</AdminTd>
                <AdminTd><Link className="font-bold text-[#e85d00]" href={`/admin/collector-sets/${set.id}`}>Chi tiết</Link></AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : <AdminEmptyState>Chưa có bộ sưu tập.</AdminEmptyState>}
    </AdminPage>
  );
}

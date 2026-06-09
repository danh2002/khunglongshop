import Link from "next/link";
import {
  AdminActionLink,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/AdminUi";
import prisma from "@/utils/db";

export default async function MerchantPage() {
  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { products: true } } },
  });
  return (
    <AdminPage>
      <AdminPageHeader
        title="Merchant"
        description="Quản lý nhà cung cấp và trạng thái hoạt động."
        action={<AdminActionLink href="/admin/merchant/new">Tạo merchant</AdminActionLink>}
      />
      {merchants.length ? (
        <AdminTable>
          <thead><tr><AdminTh>Tên</AdminTh><AdminTh>Liên hệ</AdminTh><AdminTh>Trạng thái</AdminTh><AdminTh>Sản phẩm</AdminTh><AdminTh /></tr></thead>
          <tbody>
            {merchants.map((merchant) => (
              <tr key={merchant.id}>
                <AdminTd>{merchant.name}</AdminTd>
                <AdminTd>{merchant.email ?? merchant.phone ?? "-"}</AdminTd>
                <AdminTd><AdminStatusBadge tone={merchant.status === "ACTIVE" ? "success" : "neutral"}>{merchant.status}</AdminStatusBadge></AdminTd>
                <AdminTd>{merchant._count.products}</AdminTd>
                <AdminTd><Link className="font-bold text-[#e85d00]" href={`/admin/merchant/${merchant.id}`}>Chỉnh sửa</Link></AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : <AdminEmptyState>Chưa có merchant.</AdminEmptyState>}
    </AdminPage>
  );
}

import Link from "next/link";
import {
  AdminMetric,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/AdminUi";
import prisma from "@/utils/db";

export default async function AdminDashboardPage() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    orderCount,
    revenue,
    userCount,
    productCount,
    redeemedCodeCount,
    completedSetCount,
    recentOrders,
    recentRewards,
  ] = await Promise.all([
    prisma.customer_order.count({ where: { dateTime: { gte: startOfMonth } } }),
    prisma.customer_order.aggregate({
      where: { dateTime: { gte: startOfMonth } },
      _sum: { total: true },
    }),
    prisma.user.count({ where: { role: "user", isActive: true } }),
    prisma.product.count(),
    prisma.redemptionCode.count({
      where: { status: "REDEEMED", usedAt: { gte: startOfMonth } },
    }),
    prisma.setReward.count({ where: { grantedAt: { gte: startOfMonth } } }),
    prisma.customer_order.findMany({ orderBy: { dateTime: "desc" }, take: 5 }),
    prisma.setReward.findMany({
      orderBy: { grantedAt: "desc" },
      take: 5,
      include: { set: true, user: { select: { email: true } } },
    }),
  ]);

  return (
    <AdminPage>
      <AdminPageHeader
        title="Tổng quan"
        description="Tình hình vận hành trong tháng hiện tại."
      />
      <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        <AdminMetric label="Đơn hàng" value={orderCount} hint="Tháng hiện tại" />
        <AdminMetric
          label="Doanh thu"
          value={`${(revenue._sum.total ?? 0).toLocaleString("vi-VN")}đ`}
          hint="Theo tổng đơn hàng"
        />
        <AdminMetric label="Khách hàng" value={userCount} />
        <AdminMetric label="Sản phẩm" value={productCount} />
        <AdminMetric label="Mã đã mở" value={redeemedCodeCount} hint="Tháng hiện tại" />
        <AdminMetric label="Bộ hoàn thành" value={completedSetCount} hint="Tháng hiện tại" />
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase">Đơn hàng mới</h2>
          <Link className="text-sm font-bold text-[#e85d00]" href="/admin/orders">
            Xem tất cả
          </Link>
        </div>
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Mã</AdminTh>
              <AdminTh>Khách hàng</AdminTh>
              <AdminTh>Trạng thái</AdminTh>
              <AdminTh>Tổng</AdminTh>
              <AdminTh>Ngày</AdminTh>
            </tr>
          </thead>
          <tbody>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <AdminTd>
                  <Link className="font-mono text-[#e85d00]" href={`/admin/orders/${order.id}`}>
                    #{order.id.slice(0, 8)}
                  </Link>
                </AdminTd>
                <AdminTd>{order.email}</AdminTd>
                <AdminTd>
                  <AdminStatusBadge tone={order.status === "CANCELLED" ? "danger" : "warning"}>
                    {order.status}
                  </AdminStatusBadge>
                </AdminTd>
                <AdminTd>{order.total.toLocaleString("vi-VN")}đ</AdminTd>
                <AdminTd>{order.dateTime?.toLocaleDateString("vi-VN") ?? "-"}</AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </section>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase">Phần thưởng mới</h2>
          <Link className="text-sm font-bold text-[#e85d00]" href="/admin/set-rewards">
            Xem tất cả
          </Link>
        </div>
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Mã thưởng</AdminTh>
              <AdminTh>Người dùng</AdminTh>
              <AdminTh>Bộ sưu tập</AdminTh>
              <AdminTh>Trạng thái</AdminTh>
            </tr>
          </thead>
          <tbody>
            {recentRewards.map((reward) => (
              <tr key={reward.id}>
                <AdminTd className="font-mono">{reward.rewardCode}</AdminTd>
                <AdminTd>{reward.user.email}</AdminTd>
                <AdminTd>{reward.set.name}</AdminTd>
                <AdminTd>
                  <AdminStatusBadge tone={reward.isClaimed ? "success" : "warning"}>
                    {reward.isClaimed ? "Đã nhận" : "Chờ nhận"}
                  </AdminStatusBadge>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </section>
    </AdminPage>
  );
}

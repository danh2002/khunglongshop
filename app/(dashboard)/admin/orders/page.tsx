import { OrderStatus, Prisma } from "@prisma/client";
import Link from "next/link";
import {
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTh,
  adminInputClass,
  adminSecondaryButtonClass,
} from "@/components/admin/AdminUi";
import { buildAdminOrderSearchWhere } from "@/lib/adminOrderSearch";
import prisma from "@/utils/db";

const PAGE_SIZE = 20;

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(Number(params.page ?? 1), 1);
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const dateFrom = typeof params.dateFrom === "string" ? params.dateFrom : "";
  const dateTo = typeof params.dateTo === "string" ? params.dateTo : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const status = Object.values(OrderStatus).includes(rawStatus as OrderStatus)
    ? (rawStatus as OrderStatus)
    : undefined;
  const where: Prisma.Customer_orderWhereInput = {
    ...(status ? { status } : {}),
    ...(dateFrom || dateTo
      ? {
          dateTime: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo + "T23:59:59") } : {}),
          },
        }
      : {}),
    ...buildAdminOrderSearchWhere(search),
  };
  const [orders, total] = await Promise.all([
    prisma.customer_order.findMany({
      where,
      orderBy: { dateTime: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.customer_order.count({ where }),
  ]);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <AdminPage>
      <AdminPageHeader title="Đơn hàng" description={`${total} đơn phù hợp bộ lọc.`} />
      <form className="mb-5 flex flex-wrap gap-3">
        <input
          className={`${adminInputClass} min-w-[260px] flex-1`}
          name="search"
          defaultValue={search}
          placeholder="Mã đơn, email, tên hoặc số điện thoại"
        />
        <select className={adminInputClass} name="status" defaultValue={status ?? ""}>
          <option value="">Tất cả trạng thái</option>
          {Object.values(OrderStatus).map((value) => (
            <option key={value} value={value}>
              {STATUS_LABEL[value]}
            </option>
          ))}
        </select>
        <input
          aria-label="Từ ngày"
          className={adminInputClass}
          type="date"
          name="dateFrom"
          defaultValue={dateFrom}
        />
        <input
          aria-label="Đến ngày"
          className={adminInputClass}
          type="date"
          name="dateTo"
          defaultValue={dateTo}
        />
        <button className={adminSecondaryButtonClass} type="submit">
          Lọc
        </button>
      </form>

      {orders.length ? (
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Mã đơn</AdminTh>
              <AdminTh>Khách hàng</AdminTh>
              <AdminTh>Liên hệ</AdminTh>
              <AdminTh>Trạng thái</AdminTh>
              <AdminTh>Tổng</AdminTh>
              <AdminTh>Ngày</AdminTh>
              <AdminTh />
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <AdminTd className="font-mono">#{order.orderNumber}</AdminTd>
                <AdminTd>{`${order.name} ${order.lastname}`.trim()}</AdminTd>
                <AdminTd>
                  <div>{order.email}</div>
                  <div className="text-xs text-white/45">{order.phone}</div>
                </AdminTd>
                <AdminTd>
                  <AdminStatusBadge
                    tone={
                      order.status === "COMPLETED"
                        ? "success"
                        : order.status === "CANCELLED"
                          ? "danger"
                          : "warning"
                    }
                  >
                    {STATUS_LABEL[order.status]}
                  </AdminStatusBadge>
                </AdminTd>
                <AdminTd>{order.total.toLocaleString("vi-VN")}đ</AdminTd>
                <AdminTd>{order.dateTime?.toLocaleDateString("vi-VN") ?? "-"}</AdminTd>
                <AdminTd>
                  <Link className="font-bold text-[#e85d00]" href={`/admin/orders/${order.id}`}>
                    Chi tiết
                  </Link>
                </AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : (
        <AdminEmptyState>Không có đơn hàng phù hợp.</AdminEmptyState>
      )}

      <nav className="mt-5 flex items-center gap-4 text-sm">
        {page > 1 ? (
          <Link className="font-bold text-[#e85d00]" href={`?page=${page - 1}&search=${encodeURIComponent(search)}&status=${status ?? ""}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`}>
            Trang trước
          </Link>
        ) : null}
        <span className="text-white/50">
          Trang {page}/{totalPages}
        </span>
        {page < totalPages ? (
          <Link className="font-bold text-[#e85d00]" href={`?page=${page + 1}&search=${encodeURIComponent(search)}&status=${status ?? ""}&dateFrom=${encodeURIComponent(dateFrom)}&dateTo=${encodeURIComponent(dateTo)}`}>
            Trang sau
          </Link>
        ) : null}
      </nav>
    </AdminPage>
  );
}

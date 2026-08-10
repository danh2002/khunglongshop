import { notFound } from "next/navigation";
import {
  AdminMetric,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/AdminUi";
import OrderStatusForm from "@/components/admin/OrderStatusForm";
import PaymentConfirmationButton from "@/components/admin/PaymentConfirmationButton";
import prisma from "@/utils/db";
import type { OrderStatus, Prisma } from "@prisma/client";

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

function getCancellationReason(metadata: Prisma.JsonValue | null) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const reason = (metadata as Record<string, unknown>).reason;
  return typeof reason === "string" && reason.trim() ? reason.trim() : null;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const order = await prisma.customer_order.findUnique({
    where: { id },
    include: {
      products: {
        include: { product: { select: { title: true, slug: true, mainImage: true } } },
      },
    },
  });
  if (!order) notFound();

  const cancellationAudit = order.status === "CANCELLED"
    ? await prisma.adminAuditLog.findFirst({
        where: {
          action: "ORDER_CANCELLED",
          entityType: "Customer_order",
          entityId: order.id,
        },
        orderBy: { createdAt: "desc" },
        select: { metadata: true },
      })
    : null;
  const cancellationReason = getCancellationReason(cancellationAudit?.metadata ?? null);

  return (
    <AdminPage>
      <AdminPageHeader
        title={`Đơn #${order.orderNumber}`}
        description={order.dateTime?.toLocaleString("vi-VN") ?? "Không có thời gian"}
        action={
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
        }
      />
      <section className="grid gap-3 md:grid-cols-3">
        <AdminMetric label="Khách hàng" value={`${order.name} ${order.lastname}`.trim()} />
        <AdminMetric label="Email" value={order.email} />
        <AdminMetric label="Tổng đơn" value={`${order.total.toLocaleString("vi-VN")}đ`} />
      </section>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="border border-white/10 bg-[#0f0f0f] p-5">
          <h2 className="mb-4 font-black uppercase">Giao hàng</h2>
          <dl className="grid gap-2 text-sm text-white/65">
            <div><dt className="font-bold text-white">Điện thoại</dt><dd>{order.phone}</dd></div>
            <div><dt className="font-bold text-white">Địa chỉ</dt><dd>{order.adress} {order.apartment}</dd></div>
            <div><dt className="font-bold text-white">Khu vực</dt><dd>{order.city}, {order.country} {order.postalCode}</dd></div>
            {order.orderNotice ? <div><dt className="font-bold text-white">Ghi chú</dt><dd>{order.orderNotice}</dd></div> : null}
          </dl>
        </div>
        <div className="grid gap-4">
          <div className="border border-white/10 bg-[#0f0f0f] p-5">
            <h2 className="mb-4 font-black uppercase">Chuyển trạng thái</h2>
            <OrderStatusForm orderId={order.id} status={order.status} />
          </div>
          {order.status === "CANCELLED" && cancellationReason ? (
            <section className="border-l-4 border-red-500 bg-red-950/30 px-4 py-3">
              <h2 className="font-black uppercase">Lý do huỷ</h2>
              <p className="mt-2 text-gray-300">{cancellationReason}</p>
            </section>
          ) : null}
        </div>
      </section>

      <section className="mt-8 border border-[#e85d00]/30 bg-[#0f0f0f] p-5">
        <h2 className="font-black uppercase">Thanh toán ngân hàng</h2>
        <dl className="mt-4 grid gap-3 text-sm md:grid-cols-2">
          <div><dt className="text-white/50">Mã chuyển khoản</dt><dd className="font-mono font-black">{order.paymentRef ?? "Chưa có"}</dd></div>
          <div><dt className="text-white/50">Khách hàng xác nhận lúc</dt><dd>{order.customerClaimedAt?.toLocaleString("vi-VN") ?? "Chưa xác nhận"}</dd></div>
          <div><dt className="text-white/50">Nội dung KH nhập</dt><dd className="font-mono text-xs text-white/80">{order.customerClaimedRef ?? "—"}</dd></div>
          <div><dt className="text-white/50">Hạn thanh toán</dt><dd>{order.paymentExpiresAt?.toLocaleString("vi-VN") ?? "Chưa có"}</dd></div>
          <div><dt className="text-white/50">Đã xác nhận lúc</dt><dd>{order.paidAt?.toLocaleString("vi-VN") ?? "Chưa xác nhận"}</dd></div>
          <div><dt className="text-white/50">Tổng cần nhận</dt><dd className="font-black text-[#e85d00]">{order.total.toLocaleString("vi-VN")}đ</dd></div>
        </dl>
        {order.status === "PENDING_PAYMENT" && !order.paidAt ? (
          <div className="mt-5">
            <PaymentConfirmationButton orderId={order.id} />
          </div>
        ) : null}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-black uppercase">Sản phẩm</h2>
        <AdminTable>
          <thead>
            <tr>
              <AdminTh>Sản phẩm</AdminTh>
              <AdminTh>Nguồn snapshot</AdminTh>
              <AdminTh>Đơn giá</AdminTh>
              <AdminTh>Số lượng</AdminTh>
              <AdminTh>Thành tiền</AdminTh>
            </tr>
          </thead>
          <tbody>
            {order.products.map((item) => {
              const title = item.productTitle ?? item.product.title;
              const unitPrice = item.unitPrice ?? 0;
              return (
                <tr key={item.id}>
                  <AdminTd>{title}</AdminTd>
                  <AdminTd>{item.snapshotSource ?? "Chưa backfill"}</AdminTd>
                  <AdminTd>{unitPrice.toLocaleString("vi-VN")}đ</AdminTd>
                  <AdminTd>{item.quantity}</AdminTd>
                  <AdminTd>{(unitPrice * item.quantity).toLocaleString("vi-VN")}đ</AdminTd>
                </tr>
              );
            })}
          </tbody>
        </AdminTable>
      </section>
    </AdminPage>
  );
}

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
import prisma from "@/utils/db";

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

  return (
    <AdminPage>
      <AdminPageHeader
        title={`Đơn #${order.id.slice(0, 10)}`}
        description={order.dateTime?.toLocaleString("vi-VN") ?? "Không có thời gian"}
        action={
          <AdminStatusBadge
            tone={
              order.status === "DELIVERED"
                ? "success"
                : order.status === "CANCELLED"
                  ? "danger"
                  : "warning"
            }
          >
            {order.status}
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
        <div className="border border-white/10 bg-[#0f0f0f] p-5">
          <h2 className="mb-4 font-black uppercase">Chuyển trạng thái</h2>
          <OrderStatusForm orderId={order.id} status={order.status} />
        </div>
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

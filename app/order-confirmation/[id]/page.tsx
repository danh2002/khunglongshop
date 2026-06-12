import { getServerSession } from "next-auth/next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import SectionTitle from "@/components/SectionTitle";
import { SectionShell, Wrapper } from "@/components/design-system";
import { formatVndTotal } from "@/lib/currency";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";

const rarityLabel = {
  COMMON: "Phổ biến",
  RARE: "Hiếm",
  EPIC: "Sử thi",
  LEGENDARY: "Huyền thoại",
} as const;

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/order-confirmation");
  }

  const { id } = await params;
  const order = await prisma.customer_order.findFirst({
    where: { id, userId: session.user.id },
    include: {
      products: {
        orderBy: { id: "asc" },
        include: { product: true },
      },
      blindBoxAllocations: {
        where: { status: "ACTIVE" },
        orderBy: [{ orderItemId: "asc" }, { unitIndex: "asc" }],
        include: {
          product: true,
          redemptionCode: { select: { code: true, status: true } },
        },
      },
    },
  });

  if (!order) notFound();

  return (
    <>
      <SectionTitle title="Đặt Hàng Thành Công" path="TRANG CHỦ | ĐƠN HÀNG" />
      <SectionShell>
        <Wrapper>
          <div className="grid gap-8 py-10 text-white">
            <section className="border border-[#e85d00]/30 bg-[#111] p-6">
              <p className="text-sm font-black uppercase text-[#e85d00]">
                Mã đơn: {order.id}
              </p>
              <h1 className="mt-2 text-3xl font-black uppercase italic">
                Đơn hàng đang được chuẩn bị
              </h1>
              <p className="mt-3 text-white/60">
                Đơn hàng sẽ được đóng gói trong vòng 2 ngày làm việc.
              </p>
              <p className="mt-4 text-xl font-black text-[#e85d00]">
                Tổng tiền: {formatVndTotal(order.total)}
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-black uppercase italic">
                Sản phẩm đã mua
              </h2>
              <div className="mt-5 grid gap-4">
                {order.products.map((item) => (
                  <article
                    key={item.id}
                    className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-4 border border-white/10 bg-[#111] p-4 max-sm:grid-cols-[72px_minmax(0,1fr)]"
                  >
                    <div className="relative aspect-square bg-black">
                      <Image
                        src={
                          item.product.mainImage.startsWith("/")
                            ? item.product.mainImage
                            : `/${item.product.mainImage}`
                        }
                        alt={item.productTitle}
                        fill
                        className="object-contain"
                        sizes="88px"
                      />
                    </div>
                    <div>
                      <h3 className="font-black text-white">{item.productTitle}</h3>
                      <p className="mt-1 text-sm text-white/55">
                        Số lượng: {item.quantity} · {formatVndTotal(item.unitPrice)}
                      </p>
                    </div>
                    <p className="font-black text-[#e85d00] max-sm:col-start-2">
                      {formatVndTotal(item.unitPrice * item.quantity)}
                    </p>
                  </article>
                ))}
              </div>
            </section>

            {order.blindBoxAllocations.length > 0 ? (
              <section>
                <h2 className="text-2xl font-black uppercase italic">
                  Kết quả túi mù
                </h2>
                <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {order.blindBoxAllocations.map((allocation) => (
                    <article
                      key={allocation.id}
                      className="border border-[#e85d00]/30 bg-[#111] p-4"
                    >
                      <div className="relative aspect-square bg-black">
                        <Image
                          src={
                            allocation.product.mainImage.startsWith("/")
                              ? allocation.product.mainImage
                              : `/${allocation.product.mainImage}`
                          }
                          alt={allocation.product.title}
                          fill
                          className="object-contain"
                          sizes="(max-width: 768px) 100vw, 320px"
                        />
                      </div>
                      <p className="mt-4 text-xs font-black uppercase text-[#e85d00]">
                        {rarityLabel[allocation.rarityTier]}
                      </p>
                      <h3 className="text-xl font-black uppercase italic">
                        {allocation.product.title}
                      </h3>
                      <p className="mt-1 text-white/55">
                        Slot {allocation.product.setSlotNumber ?? "-"}
                      </p>
                      <p className="mt-3 break-all border border-white/10 bg-black p-3 font-mono text-sm text-white/80">
                        {allocation.redemptionCode?.code}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </Wrapper>
      </SectionShell>
    </>
  );
}

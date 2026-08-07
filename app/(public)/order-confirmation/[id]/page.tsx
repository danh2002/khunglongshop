import { getServerSession } from "next-auth/next";
import Image from "next/image";
import { notFound, redirect } from "next/navigation";
import SectionTitle from "@/components/SectionTitle";
import { SectionShell, Wrapper } from "@/components/design-system";
import { formatVndTotal } from "@/lib/currency";
import { normalizeCatalogImage } from "@/lib/publicCatalog";
import { authOptions } from "@/utils/authOptions";
import prisma from "@/utils/db";
import PaymentQrPanel from "@/components/PaymentQrPanel";
import { getPaymentConfig, toPaymentDto } from "@/lib/payment";

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
    },
  });

  if (!order) notFound();

  const paymentConfig = getPaymentConfig();
  const payment = toPaymentDto(order, new Date(), paymentConfig);

  return (
    <>
      <SectionTitle title="Đặt Hàng Thành Công" path="TRANG CHỦ | ĐƠN HÀNG" />
      <SectionShell>
        <Wrapper>
          <div className="grid gap-8 py-10 text-white">
            <PaymentQrPanel
              accountName={paymentConfig.accountName}
              accountNo={paymentConfig.accountNo}
              bankName={paymentConfig.bankName}
              initialPayment={payment}
            />

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
                        src={normalizeCatalogImage(item.product.mainImage)}
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

          </div>
        </Wrapper>
      </SectionShell>
    </>
  );
}

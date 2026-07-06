"use client";

import Image from "next/image";
import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import { Eyebrow, SectionShell, Wrapper } from "@/components/design-system";
import { formatVndTotal } from "@/lib/currency";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

type OrderStatus = "pending_payment" | "processing" | "completed" | "canceled" | "unknown";

type OrderDetail = {
  id: string;
  orderNumber: number;
  dateTime: string | null;
  status: OrderStatus;
  rawStatus: string;
  total: number;
  shipping: {
    name: string;
    lastname: string;
    phone: string;
    address: string;
    apartment: string;
    city: string;
    country: string;
    postalCode: string;
  };
  products: Array<{
    id: string;
    title: string;
    slug: string;
    image: string | null;
    price: number;
    quantity: number;
  }>;
};

const statusSteps: Array<{ key: Exclude<OrderStatus, "canceled" | "unknown">; label: string }> = [
  { key: "pending_payment", label: "Chờ thanh toán" },
  { key: "processing", label: "Đang xử lý" },
  { key: "completed", label: "Hoàn thành" },
];

const Shell = styled(SectionShell)`
  min-height: 100vh;
`;

const DetailWrap = styled(Wrapper)`
  display: grid;
  gap: 2rem;
`;

const BackLink = styled(Link)`
  width: fit-content;
  color: #f47912;
  font-size: 0.78rem;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
`;

const Title = styled.h1`
  margin: 0.75rem 0 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(2rem, 5vw, 4.4rem);
  font-style: italic;
  font-weight: 900;
  line-height: 0.95;
  overflow-wrap: anywhere;
  text-transform: uppercase;

  span {
    color: #f47912;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(280px, 0.8fr);
  gap: 1rem;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.section`
  padding: 1.25rem;
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.16);
`;

const PanelTitle = styled.h2`
  margin: 0 0 1rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const Timeline = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.6rem;

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
  }
`;

const Step = styled.div<{ $active: boolean }>`
  padding: 0.85rem;
  background: ${({ $active }) => ($active ? "rgba(255, 106, 0, 0.14)" : "rgba(255, 255, 255, 0.035)")};
  border: 1px solid ${({ $active }) => ($active ? "rgba(255, 106, 0, 0.42)" : "rgba(255, 255, 255, 0.08)")};
  color: ${({ $active }) => ($active ? "#f47912" : "rgba(255, 255, 255, 0.44)")};
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const ProductList = styled.div`
  display: grid;
  gap: 0.8rem;
`;

const ProductRow = styled(Link)`
  display: grid;
  grid-template-columns: 72px minmax(0, 1fr) auto;
  gap: 0.9rem;
  align-items: center;
  color: rgba(255, 255, 255, 0.88);
  text-decoration: none;

  @media (max-width: 580px) {
    grid-template-columns: 56px minmax(0, 1fr);
  }
`;

const ProductImage = styled.div`
  width: 72px;
  height: 72px;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.16);

  @media (max-width: 580px) {
    width: 56px;
    height: 56px;
  }
`;

const ProductName = styled.strong`
  display: block;
  overflow-wrap: anywhere;
`;

const Meta = styled.p`
  margin: 0.25rem 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.82rem;
`;

const Address = styled.div`
  display: grid;
  gap: 0.7rem;
  color: rgba(255, 255, 255, 0.66);
`;

const Total = styled.strong`
  color: #f47912;
  font-size: 1.6rem;
  font-style: italic;
`;

export default function AccountOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadOrder() {
      try {
        const response = await fetch(`/api/account/orders/${id}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load order");
        setOrder(await response.json());
      } catch (error) {
        toast.error("Không tải được chi tiết đơn hàng");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrder();
  }, [id]);

  const activeStepIndex = useMemo(() => {
    if (!order) return -1;
    return statusSteps.findIndex((step) => step.key === order.status);
  }, [order]);

  return (
    <Shell>
      <DetailWrap>
        <BackLink href="/account/orders">Quay lại đơn hàng</BackLink>

        {isLoading ? (
          <Panel>Đang tải chi tiết đơn hàng...</Panel>
        ) : order ? (
          <>
            <header>
              <Eyebrow>Đơn hàng</Eyebrow>
              <Title>
                Đơn <span>#{order.orderNumber}</span>
              </Title>
              <Meta>{order.dateTime ? new Date(order.dateTime).toLocaleDateString("vi-VN") : "Chưa có ngày"}</Meta>
            </header>

            <Panel>
              <PanelTitle>Trạng thái</PanelTitle>
              {order.status === "canceled" ? (
                <Step $active>Đã hủy</Step>
              ) : order.status === "unknown" ? (
                <Step $active>{order.rawStatus || "Không xác định"}</Step>
              ) : (
                <Timeline>
                  {statusSteps.map((step, index) => (
                    <Step key={step.key} $active={index <= activeStepIndex}>
                      {step.label}
                    </Step>
                  ))}
                </Timeline>
              )}
            </Panel>

            <Grid>
              <Panel>
                <PanelTitle>Sản phẩm</PanelTitle>
                <ProductList>
                  {order.products.map((product) => (
                    <ProductRow key={product.id} href={`/product/${product.slug}`}>
                      <ProductImage>
                        {product.image ? (
                          <Image src={normalizeCatalogImage(product.image)} alt={product.title} fill sizes="72px" style={{ objectFit: "cover" }} />
                        ) : null}
                      </ProductImage>
                      <div>
                        <ProductName>{product.title}</ProductName>
                        <Meta>
                          x{product.quantity} · {formatVndTotal(product.price)}
                        </Meta>
                      </div>
                      <Total>{formatVndTotal(product.price * product.quantity)}</Total>
                    </ProductRow>
                  ))}
                </ProductList>
              </Panel>

              <Panel>
                <PanelTitle>Giao hàng</PanelTitle>
                <Address>
                  <strong>
                    {order.shipping.name} {order.shipping.lastname}
                  </strong>
                  <span>{order.shipping.phone}</span>
                  <span>
                    {order.shipping.address}, {order.shipping.apartment}
                  </span>
                  <span>
                    {order.shipping.city}, {order.shipping.country} {order.shipping.postalCode}
                  </span>
                  <Total>Tổng: {formatVndTotal(order.total)}</Total>
                </Address>
              </Panel>
            </Grid>
          </>
        ) : (
          <Panel>Không tìm thấy đơn hàng.</Panel>
        )}
      </DetailWrap>
    </Shell>
  );
}

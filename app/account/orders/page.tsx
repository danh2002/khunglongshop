"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import { Eyebrow, PrimaryLink, SectionShell, Wrapper } from "@/components/design-system";

type OrderSummary = {
  id: string;
  dateTime: string | null;
  status: "placed" | "packed" | "shipping" | "delivered" | "canceled" | "unknown";
  rawStatus: string;
  total: number;
  itemCount: number;
  productsPreview: Array<{
    id: string;
    title: string;
    image: string | null;
    quantity: number;
  }>;
};

type OrdersResponse = {
  orders: OrderSummary[];
  pagination: {
    page: number;
    totalPages: number;
  };
};

const statusLabels: Record<OrderSummary["status"], string> = {
  placed: "Đã đặt",
  packed: "Đã đóng gói",
  shipping: "Đang giao",
  delivered: "Đã giao",
  canceled: "Đã hủy",
  unknown: "Không xác định",
};

const filters = [
  { value: "", label: "Tất cả" },
  { value: "placed", label: "Đã đặt" },
  { value: "packed", label: "Đã đóng gói" },
  { value: "shipping", label: "Đang giao" },
  { value: "delivered", label: "Đã giao" },
];

const Shell = styled(SectionShell)`
  min-height: 100vh;
`;

const OrdersWrap = styled(Wrapper)`
  display: grid;
  gap: 2rem;
`;

const Title = styled.h1`
  margin: 0.75rem 0 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(2.4rem, 6vw, 5rem);
  font-style: italic;
  font-weight: 900;
  line-height: 0.95;
  text-transform: uppercase;

  span {
    color: #f47912;
  }
`;

const Tabs = styled.nav`
  display: flex;
  gap: 1rem;
  overflow-x: auto;
  border-bottom: 1px solid rgba(255, 106, 0, 0.16);
`;

const Tab = styled(Link)<{ $active: boolean }>`
  padding: 0 0 0.9rem;
  border-bottom: 2px solid ${({ $active }) => ($active ? "#e85d00" : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : "rgba(255, 255, 255, 0.5)")};
  flex: 0 0 auto;
  font-size: 0.82rem;
  font-style: italic;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
`;

const List = styled.div`
  display: grid;
  gap: 1rem;
`;

const OrderCard = styled(Link)`
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 1rem;
  padding: 1.25rem;
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.16);
  color: rgba(255, 255, 255, 0.88);
  text-decoration: none;

  &:hover {
    border-color: rgba(255, 106, 0, 0.5);
  }

  @media (max-width: 760px) {
    grid-template-columns: 1fr;
  }
`;

const OrderTitle = styled.h2`
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1rem;
  font-weight: 900;
  overflow-wrap: anywhere;
`;

const Meta = styled.p`
  margin: 0.45rem 0 0;
  color: rgba(255, 255, 255, 0.5);
  font-size: 0.82rem;
`;

const Badge = styled.span<{ $status: OrderSummary["status"] }>`
  width: fit-content;
  padding: 0.35rem 0.6rem;
  background: ${({ $status }) =>
    $status === "delivered"
      ? "rgba(0, 200, 100, 0.14)"
      : $status === "canceled"
        ? "rgba(255, 60, 60, 0.14)"
        : "rgba(255, 106, 0, 0.12)"};
  border: 1px solid rgba(255, 106, 0, 0.28);
  color: ${({ $status }) => ($status === "delivered" ? "#00c864" : $status === "canceled" ? "#ff6565" : "#f47912")};
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const Preview = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;

  @media (max-width: 760px) {
    justify-content: flex-start;
  }
`;

const Thumb = styled.div`
  width: 52px;
  height: 52px;
  position: relative;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.18);
`;

const Empty = styled.div`
  min-height: 280px;
  display: grid;
  place-items: center;
  gap: 1rem;
  padding: 2rem;
  background: rgba(10, 10, 10, 0.72);
  border: 1px solid rgba(255, 106, 0, 0.16);
  text-align: center;
`;

export default function AccountOrdersPage() {
  const searchParams = useSearchParams();
  const activeStatus = searchParams.get("status") ?? "";
  const [payload, setPayload] = useState<OrdersResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (activeStatus) params.set("status", activeStatus);
    return params.toString();
  }, [activeStatus]);

  useEffect(() => {
    async function loadOrders() {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/account/orders${query ? `?${query}` : ""}`, { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load orders");
        setPayload(await response.json());
      } catch (error) {
        toast.error("Không tải được đơn hàng");
      } finally {
        setIsLoading(false);
      }
    }

    loadOrders();
  }, [query]);

  return (
    <Shell>
      <OrdersWrap>
        <header>
          <Eyebrow>Tài khoản</Eyebrow>
          <Title>
            Đơn hàng <span>đã mua</span>
          </Title>
        </header>

        <Tabs aria-label="Bộ lọc trạng thái đơn hàng">
          {filters.map((filter) => (
            <Tab key={filter.value || "all"} href={filter.value ? `/account/orders?status=${filter.value}` : "/account/orders"} $active={activeStatus === filter.value}>
              {filter.label}
            </Tab>
          ))}
        </Tabs>

        {isLoading ? (
          <Empty>Đang tải đơn hàng...</Empty>
        ) : !payload?.orders.length ? (
          <Empty>
            <strong>Bạn chưa có đơn hàng nào</strong>
            <PrimaryLink href="/shop">Đi mua sắm</PrimaryLink>
          </Empty>
        ) : (
          <List>
            {payload.orders.map((order) => (
              <OrderCard key={order.id} href={`/account/orders/${order.id}`}>
                <div>
                  <Badge $status={order.status}>{statusLabels[order.status]}</Badge>
                  <OrderTitle>Đơn #{order.id}</OrderTitle>
                  <Meta>
                    {order.dateTime ? new Date(order.dateTime).toLocaleDateString("vi-VN") : "Chưa có ngày"} · {order.itemCount} sản phẩm · ${order.total}
                  </Meta>
                </div>
                <Preview>
                  {order.productsPreview.map((product) => (
                    <Thumb key={product.id}>
                      {product.image ? (
                        <Image src={`/${product.image}`} alt={product.title} fill sizes="52px" style={{ objectFit: "cover" }} />
                      ) : null}
                    </Thumb>
                  ))}
                </Preview>
              </OrderCard>
            ))}
          </List>
        )}
      </OrdersWrap>
    </Shell>
  );
}

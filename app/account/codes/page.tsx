"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { FaRegCopy } from "react-icons/fa6";
import styled, { keyframes } from "styled-components";
import {
  Eyebrow,
  MDiv,
  MotionProvider,
  PrimaryLink,
  smoothEase,
} from "@/components/design-system";

type ProductCode = {
  id: string;
  code: string;
  productId: string;
  orderId: string | null;
  userId: string | null;
  status: "ACTIVE" | "REDEEMED" | "DISABLED";
  canRedeem?: boolean;
  redeemedAt?: string | null;
  createdAt: string;
  product: {
    id: string;
    title: string;
    slug: string;
    mainImage: string | null;
    setId: string | null;
    setSlotNumber: number | null;
    set?: {
      id: string;
      name: string;
      totalSlots: number;
    } | null;
  } | null;
};

type SetReward = {
  id: string;
  userId: string;
  setId: string;
  rewardCode: string;
  grantedAt: string;
  isClaimed: boolean;
  claimedAt?: string | null;
  set?: {
    id: string;
    name: string;
    totalSlots: number;
  } | null;
};

type CodesResponse = {
  redemptionCodes: ProductCode[];
  setRewards: SetReward[];
};

const PageShell = styled.main`
  min-height: 100vh;
  background: #070707;
  border-top: 1px solid rgba(255, 106, 0, 0.22);
`;

const Inner = styled.div`
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(4rem, 8vw, 6.4rem) clamp(1rem, 3vw, 2rem);
`;

const PageHeader = styled.header`
  display: grid;
  gap: 1rem;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(2.4rem, 6vw, 5rem);
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0;
  line-height: 0.95;
  text-transform: uppercase;

  span {
    color: #f47912;
  }
`;

const Tabs = styled.div`
  display: flex;
  gap: 1.5rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid rgba(255, 106, 0, 0.16);
`;

const TabButton = styled.button<{ $active: boolean }>`
  padding: 0 0 0.9rem;
  background: transparent;
  border: 0;
  border-bottom: 2px solid ${({ $active }) => ($active ? "#e85d00" : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : "rgba(255, 255, 255, 0.42)")};
  cursor: pointer;
  font-size: 0.85rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const List = styled.div`
  display: grid;
  gap: 1rem;
`;

const CodeCard = styled(MDiv)`
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.16);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);

  @media (max-width: 760px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const Thumbnail = styled.div`
  width: 80px;
  height: 80px;
  flex: 0 0 auto;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid rgba(255, 106, 0, 0.22);
  background: rgba(255, 106, 0, 0.05);
  color: #f47912;
  font-size: 2.5rem;
`;

const Info = styled.div`
  min-width: 0;
  flex: 1;
  display: grid;
  gap: 0.55rem;
`;

const ItemTitle = styled.h2`
  position: relative;
  margin: 0;
  padding-left: 0.9rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1rem;
  font-weight: 900;
  letter-spacing: 0;
  text-transform: uppercase;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 3px;
    height: 28px;
    background: #e85d00;
    transform: translateY(-50%);
  }
`;

const MiniLabel = styled.span`
  display: inline-grid;
  grid-template-columns: 36px auto 36px;
  align-items: center;
  gap: 0.65rem;
  width: fit-content;
  color: #e85d00;
  font-size: 0.56rem;
  font-weight: 900;
  letter-spacing: 0.18rem;
  text-transform: uppercase;

  &::before,
  &::after {
    content: "";
    height: 1px;
    background: rgba(255, 106, 0, 0.58);
  }
`;

const Meta = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.42);
  font-size: 0.72rem;
`;

const CodeArea = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-right: 5rem;

  @media (max-width: 760px) {
    width: 100%;
    margin-right: 0;
  }
`;

const CodeBlock = styled.code<{ $large?: boolean }>`
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  padding: 0.5rem 1.25rem;
  background: rgba(255, 106, 0, 0.08);
  border: 1px solid rgba(255, 106, 0, 0.28);
  color: #f47912;
  font-family: "Courier New", monospace;
  font-size: ${({ $large }) => ($large ? "1.25rem" : "1.1rem")};
  font-weight: 700;
  letter-spacing: 0.15rem;
  white-space: nowrap;
`;

const CopyButton = styled.button`
  width: 44px;
  height: 44px;
  display: inline-grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.22);
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;

  &:hover {
    color: #f47912;
    border-color: rgba(255, 106, 0, 0.42);
  }
`;

const StatusBadge = styled.span<{ $tone: "active" | "used" | "orange" }>`
  position: absolute;
  top: 0.8rem;
  right: 0.9rem;
  padding: 0.35rem 0.55rem;
  border: 1px solid
    ${({ $tone }) =>
      $tone === "active"
        ? "rgba(0, 200, 100, 0.4)"
        : $tone === "orange"
          ? "rgba(255, 106, 0, 0.4)"
          : "rgba(255, 255, 255, 0.08)"};
  background: ${({ $tone }) =>
    $tone === "active"
      ? "rgba(0, 200, 100, 0.15)"
      : $tone === "orange"
        ? "rgba(255, 106, 0, 0.12)"
        : "rgba(255, 255, 255, 0.04)"};
  color: ${({ $tone }) =>
    $tone === "active" ? "#00c864" : $tone === "orange" ? "#f47912" : "rgba(255, 255, 255, 0.28)"};
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const RedeemLink = styled(Link)`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  background: #e85d00;
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%);
  color: #fff;
  font-size: 0.78rem;
  font-style: italic;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
`;

const RedeemButton = styled.button`
  min-height: 48px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  background: #e85d00;
  border: 0;
  clip-path: polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%);
  color: #fff;
  cursor: pointer;
  font-size: 0.78rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const SkeletonCard = styled.div`
  height: 126px;
  background: linear-gradient(
    90deg,
    rgba(255, 106, 0, 0.04) 25%,
    rgba(255, 106, 0, 0.08) 50%,
    rgba(255, 106, 0, 0.04) 75%
  );
  background-size: 200% 100%;
  border: 1px solid rgba(255, 106, 0, 0.16);
  animation: ${shimmer} 1.5s infinite;
`;

const EmptyState = styled.div`
  min-height: 320px;
  display: grid;
  place-items: center;
  gap: 1rem;
  text-align: center;
  background: rgba(10, 10, 10, 0.72);
  border: 1px solid rgba(255, 106, 0, 0.16);

  strong {
    display: block;
    color: rgba(255, 255, 255, 0.88);
    font-size: 1.5rem;
    font-style: italic;
    font-weight: 900;
    text-transform: uppercase;
  }
`;

const EmptyIcon = styled.div`
  font-size: 4rem;
`;

const cardMotion = (index: number) => ({
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.48, delay: index * 0.08, ease: smoothEase },
});

const copyCode = async (code: string) => {
  await navigator.clipboard.writeText(code);
  toast.success("Đã sao chép!", { duration: 2000 });
};

export default function AccountCodesPage() {
  const [activeTab, setActiveTab] = useState<"redemption" | "rewards">("redemption");
  const [data, setData] = useState<CodesResponse>({ redemptionCodes: [], setRewards: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [redeemingCodeId, setRedeemingCodeId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCodes() {
      try {
        const response = await fetch("/api/merch/my-codes", { cache: "no-store" });

        if (!response.ok) {
          throw new Error("Unable to load codes");
        }

        const payload = await response.json();
        if (mounted) {
          setData({
            redemptionCodes: payload.redemptionCodes ?? [],
            setRewards: payload.setRewards ?? [],
          });
        }
      } catch (error) {
        if (mounted) {
          toast.error("Không tải được mã của bạn");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadCodes();

    return () => {
      mounted = false;
    };
  }, []);

  const total = data.redemptionCodes.length + data.setRewards.length;
  const activeItems = useMemo(
    () => (activeTab === "redemption" ? data.redemptionCodes : data.setRewards),
    [activeTab, data]
  );

  const redeemProductCode = async (item: ProductCode) => {
    setRedeemingCodeId(item.id);

    try {
      const response = await fetch("/api/merch/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: item.code }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          toast.error("Mã này đã được sử dụng.");
        } else if (response.status === 429) {
          toast.error("Bạn nhập mã quá nhanh. Vui lòng thử lại sau.");
        } else {
          toast.error("Mã không hợp lệ hoặc không thuộc tài khoản của bạn.");
        }
        return;
      }

      const payload = await response.json().catch(() => null);
      toast.success(payload?.setComplete ? "Đã hoàn thành bộ sưu tập!" : "Đã mở khóa vật phẩm!");
      setData((current) => ({
        ...current,
        redemptionCodes: current.redemptionCodes.map((code) =>
          code.id === item.id
            ? {
                ...code,
                status: "REDEEMED",
                canRedeem: false,
                redeemedAt: new Date().toISOString(),
              }
            : code
        ),
        setRewards: payload?.setReward
          ? [
              {
                id: payload.setReward.rewardCode,
                userId: item.userId ?? "",
                setId: payload.unlockedSlot.setId,
                rewardCode: payload.setReward.rewardCode,
                grantedAt: new Date().toISOString(),
                isClaimed: payload.setReward.isClaimed,
                set: item.product?.set ?? null,
              },
              ...current.setRewards.filter((reward) => reward.rewardCode !== payload.setReward.rewardCode),
            ]
          : current.setRewards,
      }));
    } catch (error) {
      toast.error("Không thể mở khóa mã lúc này");
    } finally {
      setRedeemingCodeId(null);
    }
  };

  return (
    <PageShell>
      <Inner>
        <PageHeader>
          <Eyebrow>TÀI KHOẢN</Eyebrow>
          <Title>
            MÃ CỦA TÔI <span>({total} mã)</span>
          </Title>
        </PageHeader>

        <Tabs role="tablist" aria-label="Mã tài khoản">
          <TabButton $active={activeTab === "redemption"} onClick={() => setActiveTab("redemption")} type="button">
            MÃ VẬT PHẨM
          </TabButton>
          <TabButton $active={activeTab === "rewards"} onClick={() => setActiveTab("rewards")} type="button">
            MÃ PHẦN THƯỞNG
          </TabButton>
        </Tabs>

        {isLoading ? (
          <List aria-label="Đang tải mã">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </List>
        ) : activeItems.length === 0 ? (
          <EmptyState>
            <div>
              <EmptyIcon>🦕</EmptyIcon>
              <strong>Chưa có mã nào</strong>
            </div>
            <PrimaryLink href="/shop">ĐI MUA SẮM</PrimaryLink>
          </EmptyState>
        ) : (
          <MotionProvider>
            <List>
              {activeTab === "redemption"
                ? data.redemptionCodes.map((item, index) => (
                    <CodeCard key={item.id} {...cardMotion(index)}>
                      <StatusBadge $tone={item.status === "REDEEMED" ? "used" : "active"}>
                        {item.status === "REDEEMED" ? "ĐÃ DÙNG" : item.status}
                      </StatusBadge>
                      <Thumbnail>
                        {item.product?.mainImage ? (
                          <Image
                            src={`/${item.product.mainImage}`}
                            alt={item.product.title}
                            width={80}
                            height={80}
                            style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          />
                        ) : (
                          "🥚"
                        )}
                      </Thumbnail>
                      <Info>
                        <ItemTitle>{item.product?.title ?? "Collector item"}</ItemTitle>
                        <MiniLabel>{item.product?.set?.name ?? "Collector set"}</MiniLabel>
                        <Meta>
                          Slot {item.product?.setSlotNumber ?? "-"} / {item.product?.set?.totalSlots ?? "-"}
                        </Meta>
                      </Info>
                      <CodeArea>
                        <CodeBlock>{item.code}</CodeBlock>
                        <CopyButton type="button" onClick={() => copyCode(item.code)} aria-label="Sao chép mã">
                          <FaRegCopy />
                        </CopyButton>
                        {item.status === "ACTIVE" && (
                          <RedeemButton
                            type="button"
                            onClick={() => redeemProductCode(item)}
                            disabled={redeemingCodeId === item.id}
                          >
                            {redeemingCodeId === item.id ? "ĐANG MỞ" : "MỞ KHÓA"}
                          </RedeemButton>
                        )}
                      </CodeArea>
                    </CodeCard>
                  ))
                : data.setRewards.map((reward, index) => (
                    <CodeCard key={reward.id} {...cardMotion(index)}>
                      <StatusBadge $tone={reward.isClaimed ? "used" : "orange"}>
                        {reward.isClaimed ? "ĐÃ ĐỔI VÀO GAME" : "CHƯA ĐỔI"}
                      </StatusBadge>
                      <Thumbnail>🥚</Thumbnail>
                      <Info>
                        <ItemTitle>{reward.set?.name ?? "Collector set"}</ItemTitle>
                        <MiniLabel>PHẦN THƯỞNG HOÀN CHỈNH BỘ SƯU TẬP</MiniLabel>
                        <Meta>{reward.grantedAt ? new Date(reward.grantedAt).toLocaleDateString("vi-VN") : ""}</Meta>
                      </Info>
                      <CodeArea>
                        <CodeBlock $large>{reward.rewardCode}</CodeBlock>
                        <CopyButton type="button" onClick={() => copyCode(reward.rewardCode)} aria-label="Sao chép mã thưởng">
                          <FaRegCopy />
                        </CopyButton>
                        {!reward.isClaimed && <RedeemLink href="/account/codes#game-guide">NHẬP VÀO GAME</RedeemLink>}
                      </CodeArea>
                    </CodeCard>
                  ))}
            </List>
          </MotionProvider>
        )}
      </Inner>
    </PageShell>
  );
}

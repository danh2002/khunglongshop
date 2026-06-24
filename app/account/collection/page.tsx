"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import styled, { keyframes } from "styled-components";
import { AnimatePresence, LazyMotion, domAnimation, m } from "framer-motion";
import { Eyebrow, PrimaryButton, smoothEase } from "@/components/design-system";
import { normalizeCatalogImage } from "@/lib/publicCatalog";

type CollectionSet = {
  set: {
    id: string;
    name: string;
    description?: string | null;
    totalSlots: number;
  };
  slots: Array<{
    slotNumber: number;
    product: {
      id: string;
      name: string;
      image: string | null;
    } | null;
    code: string | null;
    ownedCount: number;
    isCollected: boolean;
    isUnlocked: boolean;
  }>;
  isComplete: boolean;
  setReward: {
    rewardCode: string;
    isClaimed: boolean;
  } | null;
};

type CollectionResponse = {
  sets: CollectionSet[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
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

const PageTitle = styled.h1`
  margin: 0 0 3rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(2.8rem, 7vw, 5.6rem);
  font-style: italic;
  font-weight: 900;
  line-height: 0.95;
  text-transform: uppercase;

  span {
    color: #f47912;
  }
`;

const SetSection = styled.section`
  margin-bottom: clamp(3rem, 7vw, 5rem);
`;

const SectionHeader = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-end;
  margin-bottom: 1.2rem;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const HeaderLeft = styled.div`
  display: grid;
  gap: 0.8rem;
`;

const SetTitle = styled.h2`
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: clamp(1.8rem, 4vw, 3.2rem);
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const Count = styled.p`
  margin: 0;
  color: #f47912;
  font-size: 0.9rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const RedeemForm = styled.form`
  display: grid;
  grid-template-columns: minmax(0, 320px) auto;
  gap: 0.75rem;
  align-items: end;
  margin-bottom: 2rem;

  @media (max-width: 620px) {
    grid-template-columns: 1fr;
  }
`;

const RedeemLabel = styled.label`
  display: grid;
  gap: 0.45rem;
  color: rgba(255, 255, 255, 0.68);
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const RedeemInput = styled.input`
  min-width: 0;
  min-height: 54px;
  padding: 0 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.28);
  color: #fff;
  font-family: "Courier New", monospace;
  font-weight: 900;
  letter-spacing: 0.08rem;
  text-transform: uppercase;

  &:focus {
    border-color: #e85d00;
    outline: none;
  }
`;

const ProgressBar = styled.div`
  height: 6px;
  overflow: hidden;
  margin-bottom: 2rem;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 106, 0, 0.22);
  border-radius: 999px;
`;

const ProgressFill = styled(m.div)`
  height: 100%;
  background: linear-gradient(90deg, #e85d00, #f47912);
  border-radius: inherit;
`;

const SlotGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 1rem;
`;

const SlotCard = styled(m.article)`
  min-height: 180px;
  position: relative;
  overflow: hidden;
`;

const CollectedSlot = styled(SlotCard)`
  display: grid;
  grid-template-rows: 60% 40%;
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.28);
`;

const ImageFrame = styled.div`
  position: relative;
  min-height: 108px;
  background: rgba(255, 255, 255, 0.03);

  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: linear-gradient(180deg, transparent 40%, rgba(10, 10, 10, 0.96) 100%);
  }
`;

const SlotBody = styled.div`
  display: grid;
  align-content: center;
  padding: 0.75rem;
`;

const ProductName = styled.h3`
  position: relative;
  margin: 0;
  padding-left: 0.65rem;
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.72rem;
  font-weight: 900;
  line-height: 1.25;
  text-transform: uppercase;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 50%;
    width: 2px;
    height: 18px;
    background: #e85d00;
    transform: translateY(-50%);
  }
`;

const SlotBadge = styled.span<{ $collected?: boolean }>`
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  z-index: 2;
  padding: 2px 6px;
  background: ${({ $collected }) => ($collected ? "#e85d00" : "rgba(255, 255, 255, 0.08)")};
  color: ${({ $collected }) => ($collected ? "#fff" : "rgba(255, 255, 255, 0.28)")};
  font-size: 0.5rem;
  font-weight: 900;
`;

const OwnedCountBadge = styled.span`
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  z-index: 2;
  min-width: 2rem;
  padding: 2px 7px;
  background: rgba(244, 121, 18, 0.92);
  color: #fff;
  font-size: 0.58rem;
  font-weight: 900;
  text-align: center;
`;

const UncollectedSlot = styled(SlotCard)`
  display: grid;
  grid-template-rows: 60% 40%;
  background: rgba(255, 255, 255, 0.02);
  border: 1px dashed rgba(255, 106, 0, 0.18);
`;

const LockedImageFrame = styled(ImageFrame)`
  filter: grayscale(1);
  opacity: 0.3;

  &::after {
    background: linear-gradient(180deg, rgba(7, 7, 7, 0.18), rgba(7, 7, 7, 0.96));
  }
`;

const Locked = styled.div`
  margin-top: 0.35rem;
  color: rgba(255, 255, 255, 0.32);
  font-size: 0.6rem;
  font-weight: 900;
  letter-spacing: 0.1rem;
  text-transform: uppercase;
`;

const shimmer = keyframes`
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
`;

const Skeleton = styled.div`
  height: 260px;
  margin-bottom: 1rem;
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

const Empty = styled.div`
  min-height: 260px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.56);
  background: rgba(10, 10, 10, 0.72);
  border: 1px solid rgba(255, 106, 0, 0.16);
  font-size: 1.1rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const Overlay = styled(m.div)`
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: grid;
  place-items: center;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.88);
`;

const ModalPanel = styled(m.div)`
  position: relative;
  width: min(100%, 480px);
  padding: 3rem;
  overflow: hidden;
  background: rgba(10, 10, 10, 0.96);
  border: 2px solid #e85d00;
  box-shadow: 0 0 60px rgba(232, 93, 0, 0.35), 0 0 120px rgba(232, 93, 0, 0.15);
  text-align: center;
`;

const eggCrack = keyframes`
  0% { transform: scale(0); opacity: 0; }
  20% { transform: scale(1); opacity: 1; }
  32% { transform: rotate(-10deg) scale(1); }
  44% { transform: rotate(10deg) scale(1); }
  56% { transform: rotate(-10deg) scale(1); }
  68% { transform: rotate(10deg) scale(1); }
  82% { transform: scale(1.4); opacity: 0; }
  100% { transform: scale(1.4); opacity: 0; }
`;

const dinoReveal = keyframes`
  0%, 72% { opacity: 0; transform: scale(0.8); }
  100% { opacity: 1; transform: scale(1); }
`;

const EggWrap = styled.div`
  position: relative;
  height: 5rem;
  margin-bottom: 1rem;
`;

const Egg = styled.div`
  position: absolute;
  inset: 0;
  font-size: 4rem;
  animation: ${eggCrack} 1s ease forwards;
`;

const Dino = styled.div`
  position: absolute;
  inset: 0;
  font-size: 4rem;
  animation: ${dinoReveal} 1.2s ease forwards;
`;

const ModalTitle = styled.h2`
  margin: 0 0 0.75rem;
  color: #f47912;
  font-size: 2rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const ModalSubtitle = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
`;

const RewardCode = styled.code`
  display: block;
  margin: 1.5rem 0;
  padding: 0.75rem 1.5rem;
  background: rgba(255, 106, 0, 0.08);
  border: 1px solid rgba(255, 106, 0, 0.4);
  color: #f47912;
  font-family: "Courier New", monospace;
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 0.2rem;
`;

const ModalButtons = styled.div`
  display: flex;
  justify-content: center;
  gap: 1rem;

  @media (max-width: 520px) {
    flex-direction: column;
  }
`;

const SmallPrimary = styled(PrimaryButton)`
  width: auto;
  min-height: 54px;
  font-size: 0.9rem;
`;

const RedeemButton = styled(SmallPrimary)`
  min-width: 150px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const LoadMoreWrap = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 2rem;
`;

const LoadMoreButton = styled(SmallPrimary)`
  min-width: 180px;

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`;

const SecondaryButton = styled.button`
  min-height: 54px;
  padding: 0 1.4rem;
  background: rgba(14, 15, 17, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.28);
  color: #fff;
  cursor: pointer;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const burst = keyframes`
  0% { transform: translate(-50%, -50%) scale(0); opacity: 1; }
  100% { transform: translate(var(--x), var(--y)) scale(1); opacity: 0; }
`;

const Particle = styled.div<{ $index: number }>`
  position: absolute;
  left: 50%;
  top: 38%;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: ${({ $index }) => ($index % 2 ? "#f47912" : "#e85d00")};
  --x: ${({ $index }) => [80, -70, 110, -100, 20, -20, 90, -90][$index]}px;
  --y: ${({ $index }) => [-90, -80, -20, -10, 95, 85, 70, 65][$index]}px;
  animation: ${burst} 900ms ease-out forwards;
`;

const slotMotion = {
  whileHover: { y: -4, scale: 1.02 },
  transition: { duration: 0.2, ease: smoothEase },
};

export default function AccountCollectionPage() {
  const [collections, setCollections] = useState<CollectionSet[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);
  const [completeModal, setCompleteModal] = useState<CollectionSet | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadCollection() {
      try {
        const response = await fetch("/api/merch/my-collection?page=1&limit=10", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load collection");

        const payload = (await response.json()) as CollectionResponse;
        if (!mounted) return;

        setCollections(payload.sets);
        setPage(payload.pagination.page);
        setTotalPages(payload.pagination.totalPages);

        const unseenCompleteSet = payload.sets.find((item) => {
          if (!item.isComplete) return false;
          return localStorage.getItem(`dkl-collection-complete-${item.set.id}`) !== "seen";
        });

        if (unseenCompleteSet) {
          setCompleteModal(unseenCompleteSet);
        }
      } catch (error) {
        if (mounted) toast.error("Không tải được bộ sưu tập");
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadCollection();

    return () => {
      mounted = false;
    };
  }, []);

  const closeModal = () => {
    if (completeModal) {
      localStorage.setItem(`dkl-collection-complete-${completeModal.set.id}`, "seen");
    }
    setCompleteModal(null);
  };

  const copyRewardCode = async () => {
    if (!completeModal?.setReward?.rewardCode) return;
    await navigator.clipboard.writeText(completeModal.setReward.rewardCode);
    toast.success("Đã sao chép!");
  };

  const refreshCollection = async () => {
    const response = await fetch("/api/merch/my-collection?page=1&limit=10", { cache: "no-store" });
    if (!response.ok) throw new Error("Unable to load collection");

    const payload = (await response.json()) as CollectionResponse;
    setCollections(payload.sets);
    setPage(payload.pagination.page);
    setTotalPages(payload.pagination.totalPages);
    return payload.sets;
  };

  const loadMore = async () => {
    if (page >= totalPages || isLoadingMore) return;

    setIsLoadingMore(true);

    try {
      const response = await fetch(`/api/merch/my-collection?page=${page + 1}&limit=10`, { cache: "no-store" });
      if (!response.ok) throw new Error("Unable to load collection");

      const payload = (await response.json()) as CollectionResponse;
      setCollections((current) => [...current, ...payload.sets]);
      setPage(payload.pagination.page);
      setTotalPages(payload.pagination.totalPages);
    } catch (error) {
      toast.error("KhÃ´ng táº£i thÃªm Ä‘Æ°á»£c bá»™ sÆ°u táº­p");
    } finally {
      setIsLoadingMore(false);
    }
  };

  const submitRedeemCode = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = redeemCode.trim();

    if (!code) {
      toast.error("Vui lòng nhập mã mở khóa");
      return;
    }

    setIsRedeeming(true);

    try {
      const response = await fetch("/api/merch/redeem-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });
      const payload = await response.json().catch(() => null);

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

      setRedeemCode("");
      toast.success("Đã mở khóa vật phẩm!");
      const nextCollections = await refreshCollection();

      if (payload?.setComplete) {
        const completedSet = nextCollections.find((collection) => collection.set.id === payload.unlockedSlot?.setId);
        if (completedSet) {
          setCompleteModal(completedSet);
        }
      }
    } catch (error) {
      toast.error("Không thể mở khóa mã lúc này");
    } finally {
      setIsRedeeming(false);
    }
  };

  const hasCollections = useMemo(() => collections.length > 0, [collections]);

  return (
    <LazyMotion features={domAnimation}>
      <PageShell>
        <Inner>
          <PageTitle>
            BỘ SƯU TẬP <span>CỦA TÔI</span>
          </PageTitle>

          <RedeemForm onSubmit={submitRedeemCode}>
            <RedeemLabel>
              Nhập mã mở khóa
              <RedeemInput
                value={redeemCode}
                onChange={(event) => setRedeemCode(event.target.value)}
                placeholder="DKL-XXXX-XXXX-XXXX"
                autoComplete="off"
                maxLength={64}
              />
            </RedeemLabel>
            <RedeemButton type="submit" disabled={isRedeeming}>
              {isRedeeming ? "ĐANG MỞ" : "MỞ KHÓA"}
            </RedeemButton>
          </RedeemForm>

          {isLoading ? (
            <>
              <Skeleton />
              <Skeleton />
            </>
          ) : !hasCollections ? (
            <Empty>Chưa có bộ sưu tập nào</Empty>
          ) : (
            <>
              {collections.map((collection) => {
              const collected = collection.slots.filter((slot) => slot.isUnlocked ?? slot.isCollected).length;
              const percent = collection.set.totalSlots > 0 ? (collected / collection.set.totalSlots) * 100 : 0;

              return (
                <SetSection key={collection.set.id}>
                  <SectionHeader>
                    <HeaderLeft>
                      <Eyebrow>{collection.set.description || "Collector Set"}</Eyebrow>
                      <SetTitle>{collection.set.name}</SetTitle>
                    </HeaderLeft>
                    <Count>
                      {collected}/{collection.set.totalSlots} đã thu thập
                    </Count>
                  </SectionHeader>
                  <ProgressBar>
                    <ProgressFill
                      initial={{ width: 0 }}
                      whileInView={{ width: `${percent}%` }}
                      viewport={{ once: true, margin: "-80px" }}
                      transition={{ duration: 0.8, ease: smoothEase }}
                    />
                  </ProgressBar>
                  <SlotGrid>
                    {collection.slots.map((slot, index) =>
                      (slot.isUnlocked ?? slot.isCollected) && slot.product ? (
                        <CollectedSlot
                          key={slot.slotNumber}
                          {...slotMotion}
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-60px" }}
                          transition={{ duration: 0.38, delay: index * 0.04, ease: smoothEase }}
                        >
                          <SlotBadge $collected>#{slot.slotNumber}</SlotBadge>
                          {slot.ownedCount > 1 ? <OwnedCountBadge>x{slot.ownedCount}</OwnedCountBadge> : null}
                          <ImageFrame>
                            {slot.product.image ? (
                              <Image
                                src={normalizeCatalogImage(slot.product.image)}
                                alt={slot.product.name}
                                fill
                                sizes="180px"
                                style={{ objectFit: "cover" }}
                              />
                            ) : null}
                          </ImageFrame>
                          <SlotBody>
                            <ProductName>{slot.product.name}</ProductName>
                          </SlotBody>
                        </CollectedSlot>
                      ) : (
                        <UncollectedSlot
                          key={slot.slotNumber}
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, margin: "-60px" }}
                          transition={{ duration: 0.38, delay: index * 0.04, ease: smoothEase }}
                        >
                          <SlotBadge>#{slot.slotNumber}</SlotBadge>
                          <LockedImageFrame>
                            {slot.product?.image ? (
                              <Image
                                src={normalizeCatalogImage(slot.product.image)}
                                alt={slot.product.name}
                                fill
                                sizes="180px"
                                style={{ objectFit: "cover" }}
                              />
                            ) : null}
                          </LockedImageFrame>
                          <SlotBody>
                            <ProductName>{slot.product?.name || `Vật phẩm ${slot.slotNumber}`}</ProductName>
                            <Locked>Chưa mở khóa</Locked>
                          </SlotBody>
                        </UncollectedSlot>
                      )
                    )}
                  </SlotGrid>
                </SetSection>
              );
              })}

              {page < totalPages ? (
                <LoadMoreWrap>
                  <LoadMoreButton type="button" onClick={loadMore} disabled={isLoadingMore}>
                    {isLoadingMore ? "Loading..." : "Load more"}
                  </LoadMoreButton>
                </LoadMoreWrap>
              ) : null}
            </>
          )}
        </Inner>

        <AnimatePresence>
          {completeModal ? (
            <Overlay initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ModalPanel
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", stiffness: 260, damping: 20 }}
              >
                {Array.from({ length: 8 }, (_, index) => (
                  <Particle key={index} $index={index} />
                ))}
                <EggWrap>
                  <Egg>🥚</Egg>
                  <Dino>🦕</Dino>
                </EggWrap>
                <ModalTitle>BỘ SƯU TẬP HOÀN CHỈNH!</ModalTitle>
                <ModalSubtitle>Bạn đã mở khóa phần thưởng đặc biệt!</ModalSubtitle>
                <RewardCode>{completeModal.setReward?.rewardCode || "DKLS-????-????"}</RewardCode>
                <ModalButtons>
                  <SmallPrimary type="button" onClick={copyRewardCode}>
                    SAO CHÉP MÃ
                  </SmallPrimary>
                  <SecondaryButton type="button" onClick={closeModal}>
                    ĐÓNG
                  </SecondaryButton>
                </ModalButtons>
              </ModalPanel>
            </Overlay>
          ) : null}
        </AnimatePresence>
      </PageShell>
    </LazyMotion>
  );
}

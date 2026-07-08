"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import styled from "styled-components";
import { Eyebrow, PrimaryLink, SectionShell, Wrapper } from "@/components/design-system";

type ProfileResponse = {
  user: {
    email: string;
    role: string;
  };
  stats: {
    orderCount: number;
    activeOrderCount: number;
    completedOrderCount: number;
    unlockedCollectionSlots: number;
    totalCollectionSlots: number;
    completedCollectionSets: number;
  };
};

const Shell = styled(SectionShell)`
  min-height: 100vh;
`;

const AccountWrap = styled(Wrapper)`
  display: grid;
  gap: 2rem;
`;

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-end;

  @media (max-width: 720px) {
    align-items: flex-start;
    flex-direction: column;
  }
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

const LogoutButton = styled.button`
  min-height: 48px;
  padding: 0 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.28);
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  font-size: 0.78rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;

  &:hover {
    border-color: #e85d00;
    color: #f47912;
  }
`;

const Summary = styled.section`
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 2fr);
  gap: 1rem;

  @media (max-width: 860px) {
    grid-template-columns: 1fr;
  }
`;

const Panel = styled.div`
  padding: 1.25rem;
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.16);
  box-shadow: 0 20px 46px rgba(0, 0, 0, 0.45);
`;

const Label = styled.p`
  margin: 0 0 0.55rem;
  color: #f47912;
  font-size: 0.62rem;
  font-weight: 900;
  text-transform: uppercase;
`;

const Value = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1rem;
  font-weight: 900;
  overflow-wrap: anywhere;
`;

const StatGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
`;

const Stat = styled.div`
  padding: 1rem;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 106, 0, 0.14);
`;

const StatNumber = styled.strong`
  display: block;
  color: #f47912;
  font-size: 2rem;
  font-style: italic;
  line-height: 1;
`;

const LinkGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const LinkCard = styled(Link)`
  min-height: 150px;
  display: grid;
  align-content: space-between;
  padding: 1.25rem;
  background: rgba(10, 10, 10, 0.92);
  border: 1px solid rgba(255, 106, 0, 0.16);
  color: rgba(255, 255, 255, 0.88);
  text-decoration: none;

  &:hover {
    border-color: rgba(255, 106, 0, 0.5);
  }
`;

const CardTitle = styled.h2`
  margin: 0;
  color: rgba(255, 255, 255, 0.88);
  font-size: 1.1rem;
  font-style: italic;
  font-weight: 900;
  text-transform: uppercase;
`;

const CardMeta = styled.p`
  margin: 0;
  color: rgba(255, 255, 255, 0.52);
  font-size: 0.82rem;
`;

export default function AccountPage() {
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/", redirect: false });
    window.location.assign("/");
  };

  useEffect(() => {
    async function loadProfile() {
      try {
        const response = await fetch("/api/account/profile", { cache: "no-store" });
        if (!response.ok) throw new Error("Unable to load profile");
        setProfile(await response.json());
      } catch (error) {
        toast.error("Không tải được tài khoản");
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  return (
    <Shell>
      <AccountWrap>
        <Header>
          <div>
            <Eyebrow>Tài khoản</Eyebrow>
            <Title>
              Tài khoản <span>của tôi</span>
            </Title>
          </div>
          <LogoutButton type="button" onClick={handleLogout}>
            Đăng xuất
          </LogoutButton>
        </Header>

        {isLoading ? (
          <Panel>
            <Value>Đang tải tài khoản...</Value>
          </Panel>
        ) : profile ? (
          <>
            <Summary>
              <Panel>
                <Label>Email</Label>
                <Value>{profile.user.email}</Value>
                <Label style={{ marginTop: "1rem" }}>Vai trò</Label>
                <Value>{profile.user.role}</Value>
              </Panel>
              <Panel>
                <StatGrid>
                  <Stat>
                    <StatNumber>{profile.stats.orderCount}</StatNumber>
                    <CardMeta>Đơn hàng đã mua</CardMeta>
                  </Stat>
                  <Stat>
                    <StatNumber>
                      {profile.stats.unlockedCollectionSlots}/{profile.stats.totalCollectionSlots}
                    </StatNumber>
                    <CardMeta>Vật phẩm đã mở khóa</CardMeta>
                  </Stat>
                  <Stat>
                    <StatNumber>{profile.stats.completedCollectionSets}</StatNumber>
                    <CardMeta>Bộ sưu tập hoàn chỉnh</CardMeta>
                  </Stat>
                </StatGrid>
              </Panel>
            </Summary>

            <LinkGrid>
              <LinkCard href="/account/orders">
                <CardTitle>Đơn hàng đã mua</CardTitle>
                <CardMeta>{profile.stats.activeOrderCount} đơn đang xử lý</CardMeta>
              </LinkCard>
              <LinkCard href="/account/collection" prefetch={false}>
                <CardTitle>Bộ sưu tập</CardTitle>
                <CardMeta>Xem các slot đã mở và còn thiếu</CardMeta>
              </LinkCard>
              <LinkCard href="/account/codes">
                <CardTitle>Mã mở khóa</CardTitle>
                <CardMeta>Nhập mã sản phẩm và mã thưởng</CardMeta>
              </LinkCard>
            </LinkGrid>

            <PrimaryLink href="/shop">Tiếp tục mua sắm</PrimaryLink>
          </>
        ) : (
          <Panel>
            <Value>Không tìm thấy thông tin tài khoản.</Value>
          </Panel>
        )}
      </AccountWrap>
    </Shell>
  );
}

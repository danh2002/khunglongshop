"use client";

import Link from "next/link";
import styled from "styled-components";
import LanguageSwitcher from "./LanguageSwitcher";

const FooterShell = styled.footer`
  border-top: 1px solid #1a1a1a;
  background: #050505;
  padding: 64px 48px 32px;

  @media (max-width: 768px) {
    padding: 56px 24px 28px;
  }
`;

const Inner = styled.div`
  width: min(100%, 1440px);
  margin: 0 auto;
`;

const Columns = styled.div`
  display: grid;
  grid-template-columns: 1.35fr 0.8fr 0.8fr 1fr;
  gap: 48px;

  @media (max-width: 920px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 560px) {
    grid-template-columns: 1fr;
  }
`;

const Brand = styled(Link)`
  color: #ffffff;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 1px;
  text-decoration: none;
  text-transform: uppercase;
`;

const Tagline = styled.p`
  max-width: 360px;
  margin: 16px 0 0;
  color: #666666;
  font-size: 13px;
  line-height: 1.8;
`;

const Socials = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 22px;

  a {
    color: #777777;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 1px;
    text-decoration: none;
    text-transform: uppercase;
  }

  a:hover {
    color: #ffffff;
  }
`;

const Heading = styled.h3`
  margin: 0 0 20px;
  color: #e85d00;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 3px;
  text-transform: uppercase;
`;

const List = styled.ul`
  display: grid;
  gap: 0;
  margin: 0;
  padding: 0;
  list-style: none;

  a,
  span {
    color: #666666;
    font-size: 14px;
    line-height: 2.2;
    text-decoration: none;
  }

  a:hover {
    color: #ffffff;
  }
`;

const Bottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-top: 54px;
  border-top: 1px solid #1a1a1a;
  padding-top: 24px;
  color: #555555;
  font-size: 12px;

  @media (max-width: 600px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

export default function Footer() {
  return (
    <FooterShell>
      <Inner>
        <Columns>
          <div>
            <Brand href="/">Đảo Khủng Long</Brand>
            <Tagline>
              Merch giới hạn, blind box và vật phẩm collector dành cho cộng đồng Đảo Khủng Long.
            </Tagline>
            <Socials aria-label="Mạng xã hội">
              <a href="#" aria-label="Instagram">Instagram</a>
              <a href="#" aria-label="TikTok">TikTok</a>
              <a href="#" aria-label="Facebook">Facebook</a>
              <a href="#" aria-label="YouTube">YouTube</a>
            </Socials>
          </div>

          <div>
            <Heading>Khám phá</Heading>
            <List>
              <li><Link href="/">Trang chủ</Link></li>
              <li><Link href="/account/collection">Bộ sưu tập</Link></li>
              <li><Link href="/shop?type=blind-box">Túi mù</Link></li>
              <li><Link href="/account/codes">Mã của tôi</Link></li>
            </List>
          </div>

          <div>
            <Heading>Hỗ trợ</Heading>
            <List>
              <li><Link href="/about">Giới thiệu</Link></li>
              <li><Link href="/about">Liên hệ</Link></li>
              <li><Link href="/about">Chính sách đổi trả</Link></li>
              <li><Link href="/about">FAQs</Link></li>
            </List>
          </div>

          <div>
            <Heading>Liên hệ</Heading>
            <List>
              <li><a href="mailto:support@khunglongshop.vn">support@khunglongshop.vn</a></li>
              <li><a href="tel:+84901234567">090 123 4567</a></li>
              <li><span>Việt Nam</span></li>
            </List>
          </div>
        </Columns>

        <Bottom>
          <span>© {new Date().getFullYear()} Đảo Khủng Long · All rights reserved</span>
          <LanguageSwitcher />
        </Bottom>
      </Inner>
    </FooterShell>
  );
}

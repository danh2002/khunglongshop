"use client";

import Link from "next/link";
import React from "react";
import styled from "styled-components";
import { useI18n } from "./LanguageProvider";

const FooterShell = styled.footer`
  position: relative;
  overflow: hidden;
  background: #070707;
  border-top: 1px solid rgba(255, 106, 0, 0.22);

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      radial-gradient(circle at 16% 0%, rgba(255, 106, 0, 0.16), transparent 30%),
      linear-gradient(180deg, rgba(255, 106, 0, 0.06), transparent 34%);
  }
`;

const Inner = styled.div`
  position: relative;
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: clamp(3rem, 6vw, 5rem) clamp(1rem, 3vw, 2rem) 2rem;
`;

const Top = styled.div`
  display: grid;
  grid-template-columns: minmax(260px, 0.95fr) 2fr;
  gap: clamp(2rem, 5vw, 4.5rem);

  @media (max-width: 820px) {
    grid-template-columns: 1fr;
  }
`;

const BrandBlock = styled.div`
  display: grid;
  gap: 1rem;
  align-content: start;
`;

const Brand = styled(Link)`
  color: #e85d00;
  font-size: clamp(1.65rem, 3.4vw, 2.65rem);
  font-style: italic;
  font-weight: 900;
  line-height: 0.95;
  text-decoration: none;
  text-transform: uppercase;

  span {
    display: block;
    color: rgba(255, 255, 255, 0.9);
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 5px;
  }
`;

const Description = styled.p`
  max-width: 29rem;
  margin: 0;
  color: rgba(255, 255, 255, 0.56);
  font-size: 0.92rem;
  line-height: 1.8;
`;

const Socials = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-top: 0.25rem;
`;

const SocialLink = styled.a`
  display: inline-grid;
  min-width: 42px;
  height: 42px;
  place-items: center;
  padding: 0 0.8rem;
  background: rgba(255, 255, 255, 0.035);
  border: 1px solid rgba(255, 106, 0, 0.16);
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.68rem;
  font-style: italic;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;
  transition: transform 180ms ease, border-color 180ms ease, color 180ms ease, background 180ms ease;

  &:hover {
    background: rgba(232, 93, 0, 0.1);
    border-color: rgba(255, 106, 0, 0.38);
    color: #f47912;
    transform: translateY(-2px);
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const Columns = styled.nav`
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: clamp(1rem, 3vw, 2rem);

  @media (max-width: 820px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @media (max-width: 460px) {
    grid-template-columns: 1fr;
  }
`;

const ColumnTitle = styled.h3`
  margin: 0 0 1rem;
  color: rgba(255, 255, 255, 0.9);
  font-size: 0.76rem;
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0.04rem;
  text-transform: uppercase;
`;

const LinkList = styled.ul`
  display: grid;
  gap: 0.72rem;
  margin: 0;
  padding: 0;
  list-style: none;

  a {
    color: rgba(255, 255, 255, 0.46);
    font-size: 0.88rem;
    text-decoration: none;
    transition: color 160ms ease, padding-left 160ms ease;
  }

  a:hover {
    color: #e85d00;
    padding-left: 0.25rem;
  }

  a:focus-visible {
    color: #f47912;
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const Bottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-top: clamp(2rem, 4vw, 3.25rem);
  padding-top: 1.25rem;
  border-top: 1px solid rgba(255, 106, 0, 0.16);
  color: rgba(255, 255, 255, 0.34);
  font-size: 0.76rem;

  @media (max-width: 680px) {
    align-items: flex-start;
    flex-direction: column;
  }
`;

const Footer = () => {
  const { t } = useI18n();
  const groups = [
    [
      t("footer.sale"),
      [
        { name: t("products.title2"), href: "/shop" },
        { name: t("product.collectorSet"), href: "/account/collection" },
        { name: t("common.codes"), href: "/account/codes" },
      ],
    ],
    [
      t("footer.about"),
      [
        { name: t("common.about"), href: "/about" },
        { name: t("hero.title1"), href: "/" },
        { name: t("common.collection"), href: "/shop" },
      ],
    ],
    [
      t("footer.buying"),
      [
        { name: t("common.cart"), href: "/cart" },
        { name: t("common.wishlist"), href: "/wishlist" },
        { name: t("common.loginRegister"), href: "/login" },
      ],
    ],
    [
      t("footer.support"),
      [
        { name: t("common.search"), href: "/search" },
        { name: t("products.retry"), href: "/" },
        { name: t("footer.secure"), href: "#" },
      ],
    ],
  ] as const;

  return (
    <FooterShell aria-labelledby="footer-heading">
      <Inner>
        <h2 id="footer-heading" className="sr-only">
          Footer
        </h2>
        <Top>
          <BrandBlock>
            <Brand href="/">
              {"\u0110\u1EA2O KH\u1EE6NG LONG"}
              <span>MERCH</span>
            </Brand>
            <Description>{t("footer.description")}</Description>
            <Socials aria-label="Social links">
              <SocialLink href="#" aria-label="Facebook">
                FB
              </SocialLink>
              <SocialLink href="#" aria-label="Instagram">
                IG
              </SocialLink>
              <SocialLink href="#" aria-label="YouTube">
                YT
              </SocialLink>
            </Socials>
          </BrandBlock>

          <Columns aria-label="Footer navigation">
            {groups.map(([title, items]) => (
              <div key={title}>
                <ColumnTitle>{title}</ColumnTitle>
                <LinkList>
                  {items.map((item) => (
                    <li key={item.name}>
                      <Link href={item.href}>{item.name}</Link>
                    </li>
                  ))}
                </LinkList>
              </div>
            ))}
          </Columns>
        </Top>

        <Bottom>
          <span>© {new Date().getFullYear()} {"\u0110\u1EA3o Kh\u1EE7ng Long Merch"}. {t("footer.rights")}</span>
          <span>{t("footer.secure")}</span>
        </Bottom>
      </Inner>
    </FooterShell>
  );
};

export default Footer;

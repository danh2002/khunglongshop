"use client";

import Link from "next/link";
import React from "react";
import CategoryItem from "./CategoryItem";
import { categoryMenuList } from "@/lib/utils";
import styled from "styled-components";
import { useI18n } from "./LanguageProvider";
import { revealSection } from "./homeStyles";

const Section = styled.section`
  ${revealSection(180)}
  background: #070707;
  padding: 80px 0;
`;

const Inner = styled.div`
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 0 clamp(1rem, 3vw, 2rem);
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 2rem;
  border-left: 4px solid #e85d00;
  padding-left: 16px;
`;

const Title = styled.h2`
  margin: 0;
  color: #ffffff;
  font-size: clamp(2rem, 4vw, 3.4rem);
  font-weight: 950;
  letter-spacing: -0.05em;
  line-height: 1;
  text-transform: uppercase;

  span {
    color: #e85d00;
  }
`;

const ViewAll = styled(Link)`
  color: #e85d00;
  font-size: 0.82rem;
  font-weight: 900;
  text-decoration: none;
  text-transform: uppercase;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 20px;

  @media (max-width: 1024px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
`;

const counts = [32, 18, 45, 27, 16, 24, 31, 12, 23, 19];

const CategoryMenu = () => {
  const { locale, t } = useI18n();

  return (
    <Section>
      <Inner>
        <HeaderRow>
          <Title>
            {t("category.title1")} <span>{t("category.title2")}</span>
          </Title>
          <ViewAll href="/shop">{t("common.viewAll")} {"\u203A"}</ViewAll>
        </HeaderRow>
        <Grid>
          {categoryMenuList.map((item, index) => (
            <CategoryItem
              title={locale === "en" && item.titleEn ? item.titleEn : item.title}
              key={item.id}
              href={item.href}
              iconSrc={item.src}
              count={counts[index]}
            />
          ))}
        </Grid>
      </Inner>
    </Section>
  );
};

export default CategoryMenu;

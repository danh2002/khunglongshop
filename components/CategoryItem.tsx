"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import styled from "styled-components";

interface CategoryItemProps {
  count?: number;
  iconSrc?: string;
  title: string;
  href: string;
}

const CategoryLink = styled(Link)`
  min-height: 148px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.35rem;
  padding: 1rem 0.5rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.85);
  text-align: center;
  text-decoration: none;
  transition: transform 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;

  &:hover {
    background: rgba(255, 106, 0, 0.08);
    border-color: rgba(255, 106, 0, 0.35);
    box-shadow: 0 14px 32px rgba(0, 0, 0, 0.36), 0 0 22px rgba(232, 93, 0, 0.12);
    transform: translateY(-3px);
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const IconBox = styled.span`
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  background: rgba(255, 106, 0, 0.1);
  border: 1px solid rgba(255, 106, 0, 0.2);
  border-radius: 8px;
  color: #e85d00;
  font-size: 1.1rem;
  transition: border-color 200ms ease, background 200ms ease;

  ${CategoryLink}:hover & {
    background: rgba(255, 106, 0, 0.16);
    border-color: rgba(255, 106, 0, 0.5);
  }

  img {
    filter: sepia(1) saturate(2.5) hue-rotate(350deg);
    opacity: 0.88;
  }
`;

const Title = styled.h3`
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 0.65rem;
  font-weight: 900;
  letter-spacing: 0.06rem;
  line-height: 1.2;
  text-transform: uppercase;
`;

const Count = styled.p`
  margin: 0.2rem 0 0;
  color: rgba(255, 255, 255, 0.35);
  font-size: 0.58rem;
`;

const CategoryItem = ({ title, iconSrc, href, count }: CategoryItemProps) => {
  return (
    <CategoryLink href={href}>
      <IconBox aria-hidden="true">
        {iconSrc ? <Image src={iconSrc} width={24} height={24} alt="" /> : <span>{"\u25A1"}</span>}
      </IconBox>
      <Title>{title}</Title>
      {typeof count === "number" ? <Count>{count} items</Count> : null}
    </CategoryLink>
  );
};

export default CategoryItem;

"use client";

import Image from "next/image";
import Link from "next/link";
import styled from "styled-components";

interface CategoryItemProps {
  count?: number;
  iconSrc?: string;
  title: string;
  href: string;
}

const CategoryLink = styled(Link)`
  min-height: 170px;
  display: grid;
  justify-items: center;
  align-content: center;
  gap: 0.5rem;
  padding: 24px 16px;
  background: #111111;
  border: 1px solid #1e1e1e;
  border-radius: 16px;
  color: #ffffff;
  text-align: center;
  text-decoration: none;
  transition: transform 200ms ease, border-color 200ms ease, background 200ms ease, box-shadow 200ms ease;

  &:hover {
    border-color: #e85d00;
    box-shadow: 0 12px 40px rgba(232, 93, 0, 0.2);
    transform: translateY(-6px);
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 4px;
  }
`;

const IconBox = styled.span`
  width: 56px;
  height: 56px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
  background: rgba(232, 93, 0, 0.1);
  border: 0;
  border-radius: 50%;
  color: #e85d00;
  font-size: 1.1rem;
  transition: border-color 200ms ease, background 200ms ease;

  ${CategoryLink}:hover & {
    background: rgba(232, 93, 0, 0.18);
  }

  img {
    filter: sepia(1) saturate(2.5) hue-rotate(350deg);
    width: 24px;
    height: 24px;
    opacity: 0.9;
  }
`;

const Title = styled.h3`
  margin: 0;
  color: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 1px;
  line-height: 1.2;
  text-transform: uppercase;
`;

const Count = styled.p`
  margin: 0.2rem 0 0;
  color: #555555;
  font-size: 11px;

  ${CategoryLink}:hover & {
    color: #888888;
  }
`;

const CategoryItem = ({ title, iconSrc, href, count }: CategoryItemProps) => {
  return (
    <CategoryLink href={href}>
      <IconBox aria-hidden="true">
        {iconSrc ? <Image src={iconSrc} width={24} height={24} alt="" /> : <span>{"\u25A1"}</span>}
      </IconBox>
      <Title>{title}</Title>
      {typeof count === "number" ? <Count>{count} sản phẩm</Count> : null}
    </CategoryLink>
  );
};

export default CategoryItem;

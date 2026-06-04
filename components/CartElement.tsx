// *********************
// Role of the component: Cart icon and quantity that will be located in the header
// Name of the component: CartElement.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <CartElement />
// Input parameters: no input parameters
// Output: Cart icon and quantity
// *********************

"use client";
import Link from 'next/link'
import React from 'react'
import { FaCartShopping } from 'react-icons/fa6'
import { useProductStore } from "@/app/_zustand/store";
import styled from "styled-components";
import { useI18n } from "./LanguageProvider";

const IconLink = styled(Link)`
  position: relative;
  display: inline-grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: rgba(255, 255, 255, 0.7);
  text-decoration: none;
  transition: color 160ms ease, transform 160ms ease;

  &:hover {
    color: #e85d00;
    transform: translateY(-1px);
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }

  svg {
    font-size: 1.3rem;
  }
`;

const Badge = styled.span`
  position: absolute;
  top: -7px;
  right: -8px;
  min-width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 0.3rem;
  border-radius: 999px;
  background: #e85d00;
  color: #fff;
  font-size: 0.6rem;
  font-weight: 900;
`;

const CartElement = () => {
  const { allQuantity } = useProductStore();
  const { t } = useI18n();
  return (
    <IconLink href="/cart" aria-label={`${t("common.cart")}: ${allQuantity}`}>
      <FaCartShopping />
      <Badge>{ allQuantity }</Badge>
    </IconLink>
  )
}

export default CartElement

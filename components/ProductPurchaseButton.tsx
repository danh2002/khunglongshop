"use client";

import styled from "styled-components";

const ProductPurchaseButton = styled.button`
  width: 200px;
  height: 48px;
  border: 0;
  border-radius: 6px;
  background: #e85d00;
  color: #ffffff;
  font-size: 1rem;
  font-weight: 800;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover {
    background: #ff6a00;
  }

  &:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 3px;
  }

  @media (max-width: 500px) {
    width: 100%;
  }
`;

export default ProductPurchaseButton;

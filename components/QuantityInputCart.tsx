// *********************
// Role of the component: Quantity input for incrementing and decrementing product quantity on the cart page
// Name of the component: QuantityInputCart.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <QuantityInputCart product={product} />
// Input parameters: { product: ProductInCart }
// Output: one number input and two buttons
// *********************

"use client";
import { ProductInCart, useProductStore } from "@/app/_zustand/store";
import React, { useState } from "react";
import { FaPlus } from "react-icons/fa6";
import { FaMinus } from "react-icons/fa6";
import styled from "styled-components";

const QuantityControl = styled.div`
  display: inline-flex;
  align-items: center;
`;

const QuantityButton = styled.button`
  display: inline-grid;
  width: 40px;
  height: 40px;
  padding: 0;
  place-items: center;
  background: #1a1a1a;
  border: 1px solid #444444;
  color: #ffffff;
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease;

  &:hover {
    background: #e85d00;
    border-color: #e85d00;
    color: #ffffff;
  }

  &:focus-visible {
    outline: 2px solid #e85d00;
    outline-offset: 2px;
  }
`;

const QuantityValue = styled.input`
  width: 48px;
  height: 40px;
  padding: 0;
  background-color: #1a1a1a;
  border: 1px solid #444444;
  border-right: 0;
  border-left: 0;
  border-radius: 0;
  color: #ffffff;
  font-weight: 700;
  text-align: center;
  opacity: 1;
  -moz-appearance: textfield;

  &::-webkit-inner-spin-button,
  &::-webkit-outer-spin-button {
    margin: 0;
    appearance: none;
  }
`;

const QuantityInputCart = ({ product } : { product: ProductInCart }) => {
  const [quantityCount, setQuantityCount] = useState<number>(product.amount);
  const { updateCartAmount } = useProductStore();
  const inputId = `cart-quantity-${product.id}`;

  const handleQuantityChange = (actionName: string): void => {
    if (actionName === "plus") {
      setQuantityCount(() => quantityCount + 1);
      updateCartAmount(product.id, quantityCount + 1);
    } else if (actionName === "minus" && quantityCount !== 1) {
      setQuantityCount(() => quantityCount - 1);
      updateCartAmount(product.id, quantityCount - 1);
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="sr-only">
        Số lượng
      </label>

      <QuantityControl>
        <QuantityButton
          type="button"
          onClick={() => handleQuantityChange("minus")}
          aria-label="Giảm số lượng"
        >
          <FaMinus />
        </QuantityButton>

        <QuantityValue
          type="number"
          id={inputId}
          readOnly
          value={quantityCount}
        />

        <QuantityButton
          type="button"
          onClick={() => handleQuantityChange("plus")}
          aria-label="Tăng số lượng"
        >
          <FaPlus />
        </QuantityButton>
      </QuantityControl>
    </div>
  );
};

export default QuantityInputCart;

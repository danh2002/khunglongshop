// *********************
// Role of the component: Quantity input for incrementing and decrementing product quantity on the single product page
// Name of the component: QuantityInput.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <QuantityInput quantityCount={quantityCount} setQuantityCount={setQuantityCount} />
// Input parameters: QuantityInputProps interface
// Output: one number input and two buttons
// *********************

"use client";

import React from "react";
import { FaPlus } from "react-icons/fa6";
import { FaMinus } from "react-icons/fa6";
import styled from "styled-components";

interface QuantityInputProps {
  quantityCount: number;
  setQuantityCount: React.Dispatch<React.SetStateAction<number>>;
}

const QuantityRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  @media (max-width: 500px) {
    justify-content: center;
  }
`;

const QuantityLabel = styled.p`
  margin: 0;
  color: #ffffff;
  font-size: 1.125rem;
`;

const QuantityControl = styled.div`
  display: flex;
  align-items: center;
`;

const QuantityButton = styled.button`
  display: grid;
  width: 40px;
  height: 40px;
  place-items: center;
  border: 1px solid #444;
  background: #1a1a1a;
  color: #ffffff;
  cursor: pointer;
  transition: background 150ms ease;

  &:hover {
    background: #e85d00;
  }
`;

const QuantityValue = styled.input`
  width: 80px;
  height: 40px;
  border: 1px solid #444;
  border-right: 0;
  border-left: 0;
  border-radius: 0;
  background: #1a1a1a;
  color: #ffffff;
  text-align: center;
  opacity: 1;
  -webkit-text-fill-color: #ffffff;
`;

const QuantityInput = ({quantityCount, setQuantityCount} : QuantityInputProps) => {


  const handleQuantityChange = (actionName: string): void => {
    if (actionName === "plus") {
      setQuantityCount(quantityCount + 1);
    } else if (actionName === "minus" && quantityCount !== 1) {
      setQuantityCount(quantityCount - 1);
    }
  };

  return (
    <QuantityRow>
      <QuantityLabel>Số lượng:</QuantityLabel>

      <QuantityControl>
        <QuantityButton
          type="button"
          aria-label="Giảm số lượng"
          onClick={() => handleQuantityChange("minus")}
        >
          <FaMinus />
        </QuantityButton>

        <QuantityValue
          type="number"
          id="quantity"
          aria-label="Số lượng sản phẩm"
          disabled
          value={quantityCount}
        />

        <QuantityButton
          type="button"
          aria-label="Tăng số lượng"
          onClick={() => handleQuantityChange("plus")}
        >
          <FaPlus />
        </QuantityButton>
      </QuantityControl>
    </QuantityRow>
  );
};

export default QuantityInput;

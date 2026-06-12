// *********************
// Role of the component: Stock availability component for displaying current stock status of the product
// Name of the component: StockAvailabillity.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <StockAvailabillity stock={stock} inStock={inStock} />
// Input parameters: { stock: number, inStock: number }
// Output: styled text that displays current stock status on the single product page
// *********************

import styled from "styled-components";
import { FaCheck } from "react-icons/fa6";
import { FaXmark } from "react-icons/fa6";

const StockRow = styled.p`
  display: flex;
  gap: 8px;
  margin: 0;
  color: #ffffff;
  font-size: 1.125rem;

  @media (max-width: 500px) {
    justify-content: center;
  }
`;

const StockStatus = styled.span<{ $available: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: ${({ $available }) => ($available ? "#00cc66" : "#cc0000")};
  font-weight: 700;
`;

const StockAvailabillity = ({ inStock }: { stock: number; inStock: number }) => {
  const available = inStock > 0;

  return (
    <StockRow>
      Tình trạng:
      <StockStatus $available={available}>
        {available ? (
          <>
            Còn hàng <FaCheck aria-hidden="true" />
          </>
        ) : (
          <>
            Hết hàng <FaXmark aria-hidden="true" />
          </>
        )}
      </StockStatus>
    </StockRow>
  );
};

export default StockAvailabillity;

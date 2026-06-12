// *********************
// Role of the component: SortBy
// Name of the component: SortBy.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <SortBy />
// Input parameters: no input parameters
// Output: select input with options for sorting by a-z, z-a, price low, price high
// *********************

"use client";
import styled from "styled-components";
import { useSortStore } from "@/app/_zustand/sortStore";

const SortContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 1.25rem;

  @media (max-width: 1024px) {
    width: 100%;
    flex-direction: column;
    align-items: flex-start;
  }
`;

const SortLabel = styled.label`
  color: #ffffff;
  font-size: 1.25rem;
`;

const SortSelect = styled.select`
  width: 12rem;
  min-height: 46px;
  padding: 0.65rem 2.5rem 0.65rem 0.85rem;
  background-color: #1a1a1a;
  border: 1px solid #e85d00;
  border-radius: 6px;
  color: #e85d00;
  color-scheme: dark;
  cursor: pointer;
  font-size: 1rem;
  outline: none;

  &:hover {
    background-color: #111111;
  }

  &:focus-visible {
    border-color: #ff6a00;
    box-shadow: 0 0 0 3px rgba(232, 93, 0, 0.24);
  }

  option {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  option:hover,
  option:focus {
    background-color: #e85d00;
    color: #ffffff;
  }

  option:checked {
    background-color: #1a1a1a;
    color: #e85d00;
  }

  @media (max-width: 1024px) {
    width: 100%;
  }
`;

const SortBy = () => {
  // getting values from Zustand sort store
  const { sortBy, changeSortBy } = useSortStore();

  return (
    <SortContainer>
      <SortLabel htmlFor="shop-sort">Sắp xếp:</SortLabel>
      <SortSelect
        id="shop-sort"
        value={sortBy}
        onChange={(e) => changeSortBy(e.target.value)}
        name="sort"
      >
        <option value="defaultSort">Mặc định</option>
        <option value="lowPrice">Giá: Thấp → Cao</option>
        <option value="highPrice">Giá: Cao → Thấp</option>
        <option value="newestSort">Mới nhất</option>
        <option value="titleAsc">Tên: A → Z</option>
      </SortSelect>
    </SortContainer>
  );
};

export default SortBy;

"use client";

import { useRouter } from "next/navigation";
import React, { useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";
import { sanitize } from "@/lib/sanitize";
import styled from "styled-components";
import { useI18n } from "./LanguageProvider";

const SearchForm = styled.form`
  position: relative;
  display: flex;
  width: min(100%, 420px);
  max-width: 420px;
  font-family: var(--font-body), sans-serif;
`;

const SearchField = styled.input`
  width: 100%;
  height: 40px;
  padding: 0 2.65rem 0 1rem;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: #fff;
  font-size: 0.88rem;
  font-family: var(--font-body), sans-serif;
  outline: none;
  transition: border-color 160ms ease, background 160ms ease, box-shadow 160ms ease;

  &:focus {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 106, 0, 0.5);
    box-shadow: 0 0 0 2px rgba(232, 93, 0, 0.16);
  }

  &::placeholder {
    color: rgba(255, 255, 255, 0.45);
  }
`;

const SearchButton = styled.button`
  position: absolute;
  top: 0;
  right: 0;
  width: 42px;
  height: 40px;
  display: inline-grid;
  place-items: center;
  background: transparent;
  border: 0;
  color: rgba(255, 255, 255, 0.4);
  cursor: pointer;
  font-family: var(--font-body), sans-serif;
  transition: color 160ms ease, transform 160ms ease;

  &:hover {
    color: #e85d00;
    transform: scale(1.05);
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }
`;

const SearchInput = () => {
  const [searchInput, setSearchInput] = useState("");
  const router = useRouter();
  const { t } = useI18n();

  const searchProducts = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const sanitizedSearch = sanitize(searchInput);
    router.push(`/search?q=${encodeURIComponent(sanitizedSearch)}`);
    setSearchInput("");
  };

  return (
    <SearchForm onSubmit={searchProducts}>
      <SearchField
        type="text"
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        placeholder={t("common.searchMerch")}
        aria-label={t("common.searchMerch")}
      />
      <SearchButton type="submit" aria-label={t("common.search")}>
        <FaMagnifyingGlass />
      </SearchButton>
    </SearchForm>
  );
};

export default SearchInput;

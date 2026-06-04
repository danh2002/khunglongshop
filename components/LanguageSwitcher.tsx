"use client";

import styled from "styled-components";
import { useI18n } from "./LanguageProvider";
import type { Locale } from "@/lib/i18n";

const Switcher = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
`;

const Option = styled.button<{ $active: boolean }>`
  min-width: 34px;
  height: 28px;
  border: 0;
  border-radius: 3px;
  background: ${({ $active }) => ($active ? "#e85d00" : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : "rgba(255,255,255,0.62)")};
  cursor: pointer;
  font-size: 0.68rem;
  font-weight: 900;
  text-transform: uppercase;
  transition: background 160ms ease, color 160ms ease;

  &:hover {
    color: #fff;
    background: ${({ $active }) => ($active ? "#ff6a00" : "rgba(255, 106, 0, 0.12)")};
  }

  &:focus-visible {
    outline: 2px solid #f47912;
    outline-offset: 3px;
  }
`;

const LanguageSwitcher = () => {
  const { locale, setLocale, t } = useI18n();
  const options: Array<{ locale: Locale; label: string; aria: string }> = [
    { locale: "vi", label: "VI", aria: t("common.vietnamese") },
    { locale: "en", label: "EN", aria: t("common.english") },
  ];

  return (
    <Switcher aria-label={t("common.language")}>
      {options.map((option) => (
        <Option
          key={option.locale}
          type="button"
          $active={locale === option.locale}
          aria-label={option.aria}
          aria-pressed={locale === option.locale}
          onClick={() => setLocale(option.locale)}
        >
          {option.label}
        </Option>
      ))}
    </Switcher>
  );
};

export default LanguageSwitcher;

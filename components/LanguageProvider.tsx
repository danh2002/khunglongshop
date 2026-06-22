"use client";

import { useRouter } from "next/navigation";
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { normalizeLocale, translate, type Locale, type TranslationKey } from "@/lib/i18n";

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider = ({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale?: string;
}) => {
  const [locale, setLocaleState] = useState<Locale>(
    initialLocale ? normalizeLocale(initialLocale) : "vi"
  );
  const router = useRouter();

  useEffect(() => {
    if (!initialLocale) {
      const match = document.cookie.match(/(?:^|;\s*)site_lang=([^;]*)/);
      const cookieLocale = match ? normalizeLocale(decodeURIComponent(match[1])) : "vi";
      setLocaleState(cookieLocale);
    }
  }, [initialLocale]);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale: (nextLocale) => {
        setLocaleState(nextLocale);
        document.cookie = `site_lang=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
        window.localStorage.setItem("site_lang", nextLocale);
        router.refresh();
      },
      t: (key) => translate(locale, key),
    }),
    [locale, router]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useI18n() {
  const context = useContext(LanguageContext);

  if (!context) {
    throw new Error("useI18n must be used inside LanguageProvider");
  }

  return context;
}

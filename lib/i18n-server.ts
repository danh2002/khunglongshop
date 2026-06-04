import { cookies } from "next/headers";
import { normalizeLocale, translate, type TranslationKey } from "./i18n";

export async function getServerLocale() {
  const cookieStore = await cookies();
  return normalizeLocale(cookieStore.get("site_lang")?.value);
}

export async function getServerTranslator() {
  const locale = await getServerLocale();
  return {
    locale,
    t: (key: TranslationKey) => translate(locale, key),
  };
}

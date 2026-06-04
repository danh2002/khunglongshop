export const dynamic = "force-dynamic";
export const revalidate = 0;

import {
  Breadcrumb,
  Filters,
  Pagination,
  Products,
  SortBy,
} from "@/components";
import React from "react";
import { sanitize } from "@/lib/sanitize";
import { SectionShell, Wrapper } from "@/components/design-system";
import { getServerTranslator } from "@/lib/i18n-server";

// improve readabillity of category text, for example category text "smart-watches" will be "smart watches"
const improveCategoryText = (text: string): string => {
  if (text.indexOf("-") !== -1) {
    let textArray = text.split("-");

    return textArray.join(" ");
  } else {
    return text;
  }
};

const ShopPage = async ({ params, searchParams }: { params: Promise<{ slug?: string[] }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) => {
  // Await both params and searchParams
  const awaitedParams = await params;
  const awaitedSearchParams = await searchParams;
  const { t } = await getServerTranslator();
  
  return (
    <SectionShell>
      <Wrapper>
        <Breadcrumb />
        <div className="grid grid-cols-[200px_1fr] gap-x-10 max-md:grid-cols-1 max-md:gap-y-5">
          <Filters />
          <div>
            <div className="flex justify-between items-center max-lg:flex-col max-lg:gap-y-5">
              <h2 className="text-2xl font-bold max-sm:text-xl max-[400px]:text-lg uppercase italic text-white">
                {awaitedParams?.slug && awaitedParams?.slug[0]?.length > 0
                  ? sanitize(improveCategoryText(awaitedParams?.slug[0]))
                  : t("shop.allProducts")}
              </h2>

              <SortBy />
            </div>
            <div className="divider"></div>
            <Products params={awaitedParams} searchParams={awaitedSearchParams} />
            <Pagination />
          </div>
        </div>
      </Wrapper>
    </SectionShell>
  );
};

export default ShopPage;

import { ProductItem, SectionTitle } from "@/components";
import apiClient from "@/lib/api";
import React from "react";
import { sanitize } from "@/lib/sanitize";
import { SectionShell, Wrapper } from "@/components/design-system";
import { getServerTranslator } from "@/lib/i18n-server";
import { toMerchProduct } from "@/lib/merchCatalog";

interface Props {
  searchParams: { search: string };
}

// sending api request for search results for a given search text
const SearchPage = async ({ searchParams }: Props) => {
  const sp = await searchParams;
  const { t } = await getServerTranslator();
  let products: Product[] = [];

  try {
    const data = await apiClient.get(
      `/api/search?query=${sp?.search || ""}`
    );

    if (!data.ok) {
      console.error('Failed to fetch search results:', data.statusText);
      products = [];
    } else {
      const result = await data.json();
      products = Array.isArray(result) ? result.map((product: Product, index: number) => toMerchProduct(product, index)) : [];
    }
  } catch (error) {
    console.error('Error fetching search results:', error);
    products = [];
  }

  return (
    <div>
      <SectionTitle title={t("search.page")} path={`${t("common.home")} | ${t("search.page")}`} />
      <SectionShell>
      <Wrapper>
        {sp?.search && (
          <h3 className="text-4xl text-center py-10 max-sm:text-3xl text-white uppercase italic font-black">
            {t("search.resultsFor")} {sanitize(sp?.search)}
          </h3>
        )}
        <div className="grid grid-cols-4 justify-items-center gap-x-5 gap-y-8 max-[1300px]:grid-cols-3 max-lg:grid-cols-2 max-[500px]:grid-cols-1">
          {products.length > 0 ? (
            products.map((product: any) => (
              <ProductItem key={product.id} product={product} color="black" />
            ))
          ) : (
            <h3 className="text-3xl mt-5 text-center w-full col-span-full max-[1000px]:text-2xl max-[500px]:text-lg text-white">
              {t("products.notFound")}
            </h3>
          )}
        </div>
      </Wrapper>
      </SectionShell>
    </div>
  );
};

export default SearchPage;

/*

*/

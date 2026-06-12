import { ProductItem, SectionTitle } from "@/components";
import React from "react";
import { sanitize } from "@/lib/sanitize";
import { SectionShell, Wrapper } from "@/components/design-system";
import { getServerTranslator } from "@/lib/i18n-server";
import { PUBLIC_STOREFRONT_PRODUCT_WHERE } from "@/lib/publicCatalog";
import prisma from "@/utils/db";

interface Props {
  searchParams: Promise<{ search?: string }>;
}

// sending api request for search results for a given search text
const SearchPage = async ({ searchParams }: Props) => {
  const sp = await searchParams;
  const { t } = await getServerTranslator();
  const query = sp?.search?.trim() ?? "";
  const products = await prisma.product.findMany({
    where: {
      ...PUBLIC_STOREFRONT_PRODUCT_WHERE,
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { description: { contains: query } },
              ...(/^vanie(?:\s|-)?(?:[1-9]|10)$/i.test(query)
                ? [{ slug: "vanie-blind-box" }]
                : []),
            ],
          }
        : {}),
    },
    take: 24,
    select: {
      id: true,
      slug: true,
      title: true,
      price: true,
      rating: true,
      description: true,
      mainImage: true,
      manufacturer: true,
      categoryId: true,
      inStock: true,
      setId: true,
      setSlotNumber: true,
      isCollector: true,
      isBlindBox: true,
      isVisible: true,
      blindBoxSetId: true,
      category: { select: { name: true } },
    },
  });

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
            products.map((product) => (
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

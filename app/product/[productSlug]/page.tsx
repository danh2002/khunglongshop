import {
  StockAvailabillity,
  UrgencyText,

  ProductTabs,
  SingleProductDynamicFields,
  
} from "@/components";
import apiClient from "@/lib/api";
import Image from "next/image";
import { notFound } from "next/navigation";
import React from "react";
import { FaSquareFacebook } from "react-icons/fa6";
import { FaSquareXTwitter } from "react-icons/fa6";
import { FaSquarePinterest } from "react-icons/fa6";
import { sanitize } from "@/lib/sanitize";
import { toMerchProduct } from "@/lib/merchCatalog";
import { getServerTranslator } from "@/lib/i18n-server";

interface ImageItem {
  imageID: string;
  productID: string;
  image: string;
}

interface SingleProductPageProps {
  params: Promise<{  productSlug: string, id: string }>;
}

const SingleProductPage = async ({ params }: SingleProductPageProps) => {
  const paramsAwaited = await params;
  const { t } = await getServerTranslator();
  // sending API request for a single product with a given product slug
  const data = await apiClient.get(
    `/api/slugs/${paramsAwaited?.productSlug}`
  );
  const product = await data.json();

  // sending API request for more than 1 product image if it exists
  const imagesData = await apiClient.get(
    `/api/images/${paramsAwaited?.id}`
  );
  const images = await imagesData.json();

  if (!product || product.error) {
    notFound();
  }

  const displayProduct = product.mainImage?.startsWith("merch/") ? product : toMerchProduct(product);

  return (
    <div className="bg-white">
      <div className="max-w-screen-2xl mx-auto">
        <div className="flex justify-center gap-x-16 pt-10 max-lg:flex-col items-center gap-y-5 px-5">
          <div>
            <Image
              src={displayProduct?.mainImage ? `/${displayProduct?.mainImage}` : "/product_placeholder.jpg"}
              width={500}
              height={500}
              alt={sanitize(displayProduct?.title) || "main image"}
              className="w-auto h-auto"
            />
            <div className="flex justify-around mt-5 flex-wrap gap-y-1 max-[500px]:justify-center max-[500px]:gap-x-1">
              {images?.map((imageItem: ImageItem, key: number) => (
                <Image
                  key={imageItem.imageID + key}
                  src={`/${imageItem.image}`}
                  width={100}
                  height={100}
                  alt="laptop image"
                  className="w-auto h-auto"
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-y-7 text-black max-[500px]:text-center">
        
            <h1 className="text-3xl">{sanitize(displayProduct?.title)}</h1>
            <p className="text-xl font-semibold">${displayProduct?.price}</p>
            <StockAvailabillity stock={94} inStock={displayProduct?.inStock} />
            <SingleProductDynamicFields product={displayProduct} />
            <div className="flex flex-col gap-y-2 max-[500px]:items-center">
             
              <p className="text-lg">
                {t("product.sku")}: <span className="ml-1">abccd-18</span>
              </p>
              <div className="text-lg flex gap-x-2">
                <span>{t("product.share")}:</span>
                <div className="flex items-center gap-x-1 text-2xl">
                  <FaSquareFacebook />
                  <FaSquareXTwitter />
                  <FaSquarePinterest />
                </div>
              </div>
              <div className="flex gap-x-2">
                <Image
                  src="/visa.svg"
                  width={50}
                  height={50}
                  alt="visa icon"
                  className="w-auto h-auto"
                />
                <Image
                  src="/mastercard.svg"
                  width={50}
                  height={50}
                  alt="mastercard icon"
                  className="h-auto w-auto"
                />
                <Image
                  src="/ae.svg"
                  width={50}
                  height={50}
                  alt="americal express icon"
                  className="h-auto w-auto"
                />
                <Image
                  src="/paypal.svg"
                  width={50}
                  height={50}
                  alt="paypal icon"
                  className="w-auto h-auto"
                />
                <Image
                  src="/dinersclub.svg"
                  width={50}
                  height={50}
                  alt="diners club icon"
                  className="h-auto w-auto"
                />
                <Image
                  src="/discover.svg"
                  width={50}
                  height={50}
                  alt="discover icon"
                  className="h-auto w-auto"
                />
              </div>
            </div>
          </div>
        </div>
        <div className="py-16">
          <ProductTabs product={displayProduct} />
        </div>
      </div>
    </div>
  );
};

export default SingleProductPage;

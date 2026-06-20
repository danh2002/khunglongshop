// *********************
// Role of the component: Buy Now button that adds product to the cart and redirects to the checkout page
// Name of the component: BuyNowSingleProductBtn.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <BuyNowSingleProductBtn product={product} quantityCount={quantityCount} />
// Input parameters: SingleProductBtnProps interface
// Output: Button with buy now functionality
// *********************

"use client";
import { useProductStore } from "@/app/_zustand/store";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";
import { useI18n } from "./LanguageProvider";
import ProductPurchaseButton from "./ProductPurchaseButton";

const BuyNowSingleProductBtn = ({
  product,
  quantityCount,
}: SingleProductBtnProps) => {
  const router = useRouter();
  const { addToCart } = useProductStore();
  const { t } = useI18n();

  const handleAddToCart = () => {
    if (
      !product.isBlindBox ||
      product.isCollector ||
      product.isVisible === false
    ) {
      toast.error("Sản phẩm này không được bán riêng");
      return;
    }
    addToCart({
      id: product?.id.toString(),
      title: product?.title,
      price: product?.price,
      image: product?.mainImage,
      amount: quantityCount,
      slug: product?.slug,
    });
    toast.success(t("product.addedToCart"));
    router.push("/checkout");
  };
  return (
    <ProductPurchaseButton
      type="button"
      onClick={handleAddToCart}
    >
      {t("product.buyNow")}
    </ProductPurchaseButton>
  );
};

export default BuyNowSingleProductBtn;

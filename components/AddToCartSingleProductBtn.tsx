// *********************
// Role of the component: Button for adding product to the cart on the single product page
// Name of the component: AddToCartSingleProductBtn.tsx
// Developer: Aleksandar Kuzmanovic
// Version: 1.0
// Component call: <AddToCartSingleProductBtn product={product} quantityCount={quantityCount}  />
// Input parameters: SingleProductBtnProps interface
// Output: Button with adding to cart functionality
// *********************
"use client";



import { useProductStore } from "@/app/_zustand/store";
import toast from "react-hot-toast";
import { useI18n } from "./LanguageProvider";
import ProductPurchaseButton from "./ProductPurchaseButton";


const AddToCartSingleProductBtn = ({ product, quantityCount } : SingleProductBtnProps) => {
  const { addToCart } = useProductStore();
  const { t } = useI18n();

  const handleAddToCart = () => {
    if (
      product.slug !== "vanie-blind-box" ||
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
  };
  return (
    <ProductPurchaseButton
      type="button"
      onClick={handleAddToCart}
    >
      {t("product.addToCart")}
    </ProductPurchaseButton>
  );
};

export default AddToCartSingleProductBtn;

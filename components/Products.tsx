import ProductItem from "./ProductItem";
import { PUBLIC_STOREFRONT_PRODUCT_WHERE } from "@/lib/publicCatalog";
import prisma from "@/utils/db";

const Products = async () => {
  const products = await prisma.product.findMany({
    where: PUBLIC_STOREFRONT_PRODUCT_WHERE,
    orderBy: [{ title: "asc" }, { id: "asc" }],
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
    <div className="grid grid-cols-3 justify-items-center gap-x-5 gap-y-8 max-[1300px]:grid-cols-3 max-lg:grid-cols-2 max-[500px]:grid-cols-1">
      {products.length > 0 ? (
        products.map((product) => (
          <ProductItem key={product.id} product={product} color="black" />
        ))
      ) : (
        <h3 className="text-3xl mt-5 text-center w-full col-span-full max-[1000px]:text-2xl max-[500px]:text-lg text-white">
          Không tìm thấy sản phẩm phù hợp
        </h3>
      )}
    </div>
  );
};

export default Products;

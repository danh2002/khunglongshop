import ProductItem from "./ProductItem";
import {
  buildCollectorGalleryWhere,
  buildPublicStorefrontWhere,
} from "@/lib/publicCatalog";
import prisma from "@/utils/db";

type ProductsProps = {
  categorySlug?: string | null;
  characterSlug?: string | null;
};

const Products = async ({ categorySlug, characterSlug }: ProductsProps = {}) => {
  const isCollectorGallery = Boolean(characterSlug);
  const products = await prisma.product.findMany({
    where: isCollectorGallery
      ? buildCollectorGalleryWhere({ characterSlug })
      : buildPublicStorefrontWhere({ categorySlug }),
    orderBy: isCollectorGallery
      ? [{ set: { name: "asc" } }, { setSlotNumber: "asc" }, { title: "asc" }, { id: "asc" }]
      : [{ title: "asc" }, { id: "asc" }],
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
      set: { select: { id: true, name: true, totalSlots: true } },
    },
  });

  return (
    <div className="grid grid-cols-3 justify-items-center gap-x-5 gap-y-8 max-[1300px]:grid-cols-3 max-lg:grid-cols-2 max-[500px]:grid-cols-1">
      {products.length > 0 ? (
        products.map((product) => (
          <ProductItem key={product.id} product={product} color="black" viewOnly={isCollectorGallery} />
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

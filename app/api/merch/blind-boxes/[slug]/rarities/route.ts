import { NextResponse } from "next/server";
import { validateBlindBoxPool } from "@/lib/blindBox";
import { isPubliclySellableProduct, normalizeCatalogImage } from "@/lib/publicCatalog";
import prisma from "@/utils/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const product = await prisma.product.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      isBlindBox: true,
      isVisible: true,
      isCollector: true,
      blindBoxSet: {
        select: {
          id: true,
          name: true,
          totalSlots: true,
          poolVersions: {
            where: { status: "ACTIVE" },
            take: 2,
            select: {
              id: true,
              publishedAt: true,
              entries: {
                orderBy: { slotNumber: "asc" },
                select: {
                  slotNumber: true,
                  productId: true,
                  drawWeight: true,
                  rarityTier: true,
                  product: {
                    select: {
                      title: true,
                      mainImage: true,
                      setId: true,
                      setSlotNumber: true,
                      isCollector: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  const versions = product?.blindBoxSet?.poolVersions ?? [];
  const version = versions[0];
  if (!product || !isPubliclySellableProduct(product) || !product.blindBoxSet || !version) {
    return NextResponse.json({ error: "BLIND_BOX_NOT_FOUND" }, { status: 404 });
  }

  const validation = validateBlindBoxPool(version.entries);
  const invalidRelations = version.entries.some(
    (entry) =>
      !entry.product.isCollector ||
      entry.product.setId !== product.blindBoxSet?.id ||
      entry.product.setSlotNumber !== entry.slotNumber
  );
  if (versions.length !== 1 || !validation.valid || invalidRelations) {
    console.error("[blind-box-rarity] ACTIVE_POOL_INVALID", {
      poolVersionId: version.id,
      errors: [
        ...(versions.length !== 1 ? ["ACTIVE_VERSION_COUNT_INVALID"] : []),
        ...validation.errors,
        ...(invalidRelations ? ["POOL_PRODUCT_RELATION_INVALID"] : []),
      ],
    });
    return NextResponse.json(
      { error: "ACTIVE_POOL_INVALID" },
      { status: 503 }
    );
  }

  return NextResponse.json({
    productId: product.id,
    set: {
      id: product.blindBoxSet.id,
      name: product.blindBoxSet.name,
      totalSlots: product.blindBoxSet.totalSlots,
    },
    variants: version.entries.map((entry) => ({
      slotNumber: entry.slotNumber,
      productName: entry.product.title,
      image: normalizeCatalogImage(entry.product.mainImage),
      rarityTier: entry.rarityTier,
    })),
    publishedAt: version.publishedAt?.toISOString() ?? null,
  });
}

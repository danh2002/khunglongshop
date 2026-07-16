import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/utils/adminAuth";
import prisma from "@/utils/db";
import {
  adminProductSchema,
  parseProductImages,
  serializeProductImages,
} from "@/lib/adminProduct";
import { Prisma } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function validationError(error: { flatten: () => { fieldErrors: Record<string, string[]> } }) {
  return NextResponse.json(
    {
      error: {
        code: "VALIDATION_ERROR",
        message: "Dữ liệu sản phẩm không hợp lệ",
        fieldErrors: error.flatten().fieldErrors,
      },
    },
    { status: 400 }
  );
}

async function getProductDependencyCounts(productId: string) {
  const [orderItemCount, redemptionCodeCount, bulkUploadItemCount, wishlistCount] = await Promise.all([
    prisma.customer_order_product.count({ where: { productId } }),
    prisma.redemptionCode.count({ where: { productId } }),
    prisma.bulk_upload_item.count({ where: { productId } }),
    prisma.wishlist.count({ where: { productId } }),
  ]);

  return { orderItemCount, redemptionCodeCount, bulkUploadItemCount, wishlistCount };
}

function hasProtectedProductDependencies(counts: Awaited<ReturnType<typeof getProductDependencyCounts>>) {
  return counts.orderItemCount > 0 || counts.redemptionCodeCount > 0 || counts.bulkUploadItemCount > 0;
}

async function validateRelationsForUpdate(
  productId: string,
  input: {
    categoryId: string;
    merchantId: string;
    isCollector: boolean;
    setId?: string | null;
    setSlotNumber?: number | null;
    isBlindBox: boolean;
    blindBoxSetId?: string | null;
  }
) {
  const [category, merchant, collectorSet, blindBoxSet] = await Promise.all([
    input.isBlindBox
      ? Promise.resolve(null)
      : prisma.category.findUnique({ where: { id: input.categoryId }, select: { id: true } }),
    prisma.merchant.findUnique({ where: { id: input.merchantId }, select: { id: true } }),
    input.isCollector && input.setId
      ? prisma.collectorSet.findUnique({ where: { id: input.setId }, select: { id: true, totalSlots: true } })
      : Promise.resolve(null),
    input.isBlindBox && input.blindBoxSetId
      ? prisma.collectorSet.findUnique({ where: { id: input.blindBoxSetId }, select: { id: true } })
      : Promise.resolve(null),
  ]);

  if (!category && !input.isBlindBox) {
    return { code: "CATEGORY_NOT_FOUND", message: "Danh mục không tồn tại", status: 404 };
  }
  if (!merchant) return { code: "MERCHANT_NOT_FOUND", message: "Merchant không tồn tại", status: 404 };

  if (input.isCollector) {
    if (!collectorSet) return { code: "COLLECTOR_SET_NOT_FOUND", message: "Bộ sưu tập không tồn tại", status: 404 };
    if (!input.setSlotNumber || input.setSlotNumber > collectorSet.totalSlots) {
      return { code: "INVALID_COLLECTOR_SLOT", message: "Slot nằm ngoài phạm vi bộ sưu tập", status: 400 };
    }

    const occupiedSlot = await prisma.product.findFirst({
      where: {
        setId: input.setId,
        setSlotNumber: input.setSlotNumber,
        NOT: { id: productId },
      },
      select: { id: true },
    });

    if (occupiedSlot) {
      return { code: "COLLECTOR_SLOT_OCCUPIED", message: "Slot sưu tập đã có sản phẩm", status: 409 };
    }
  }

  return null;
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true } },
      merchant: { select: { id: true, name: true } },
      set: { select: { id: true, name: true, totalSlots: true } },
    },
  });

  if (!product) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: "Không tìm thấy sản phẩm" } },
      { status: 404 }
    );
  }

  const dependencyCounts = await getProductDependencyCounts(id);

  return NextResponse.json({
    ...product,
    images: parseProductImages(product.images),
    dependencyCounts,
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = adminProductSchema.safeParse(body);

  if (!parsed.success) return validationError(parsed.error);

  const existingProduct = await prisma.product.findUnique({ where: { id } });

  if (!existingProduct) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: "Không tìm thấy sản phẩm" } },
      { status: 404 }
    );
  }

  const slugOwner = await prisma.product.findUnique({ where: { slug: parsed.data.slug }, select: { id: true } });
  if (slugOwner && slugOwner.id !== id) {
    return NextResponse.json(
      { error: { code: "SLUG_ALREADY_EXISTS", message: "Slug đã tồn tại" } },
      { status: 409 }
    );
  }

  const codeCount = await prisma.redemptionCode.count({ where: { productId: id } });
  const collectorFieldsChanged =
    existingProduct.isCollector !== parsed.data.isCollector ||
    existingProduct.setId !== parsed.data.setId ||
    existingProduct.setSlotNumber !== parsed.data.setSlotNumber ||
    existingProduct.isBlindBox !== parsed.data.isBlindBox ||
    existingProduct.blindBoxSetId !== parsed.data.blindBoxSetId;

  if (codeCount > 0 && collectorFieldsChanged) {
    return NextResponse.json(
      {
        error: {
          code: "PRODUCT_COLLECTOR_LOCKED",
          message: "Không thể đổi cấu hình sưu tập sau khi đã phát mã",
        },
      },
      { status: 409 }
    );
  }

  const relationError = await validateRelationsForUpdate(id, parsed.data);
  if (relationError) {
    return NextResponse.json(
      { error: { code: relationError.code, message: relationError.message } },
      { status: relationError.status }
    );
  }

  const updatedProduct = await prisma.product.update({
    where: { id },
    data: {
      ...parsed.data,
      images: serializeProductImages(parsed.data.images),
      isVisible: parsed.data.isVisible,
    },
    include: {
      category: { select: { id: true, name: true } },
      merchant: { select: { id: true, name: true } },
      set: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    ...updatedProduct,
    images: parseProductImages(updatedProduct.images),
  });
}

export async function PUT(request: NextRequest, context: RouteContext) {
  return PATCH(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { response } = await requireAdminApi();
  if (response) return response;

  const { id } = await context.params;
  const force = request.nextUrl.searchParams.get("force") === "true";
  const product = await prisma.product.findUnique({
    where: { id },
    select: { id: true, setId: true },
  });

  if (!product) {
    return NextResponse.json(
      { error: { code: "PRODUCT_NOT_FOUND", message: "Không tìm thấy sản phẩm" } },
      { status: 404 }
    );
  }

  if (force) {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.redemptionCode.deleteMany({ where: { productId: id } });
        await tx.blindBoxAllocation.deleteMany({ where: { productId: id } });
        await tx.blindBoxPoolEntry.deleteMany({ where: { productId: id } });
        await tx.wishlist.deleteMany({ where: { productId: id } });
        await tx.product.update({
          where: { id },
          data: {
            setId: null,
            blindBoxSetId: null,
          },
        });
        await tx.product.delete({ where: { id } });
      });

      return new NextResponse(null, { status: 204 });
    } catch (error) {
      const prismaCode = error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined;
      const prismaMessage = error instanceof Error ? error.message : String(error);

      console.error("Force product delete failed", error);
      return NextResponse.json(
        {
          error: {
            code: "PRODUCT_FORCE_DELETE_FAILED",
            message: "Không thể xóa cưỡng bức sản phẩm",
            prismaCode,
            prismaMessage,
          },
        },
        { status: 409 }
      );
    }
  }

  if (product.setId) {
    return NextResponse.json(
      {
        error: {
          code: "PRODUCT_IN_COLLECTOR_SET",
          message: "Không thể xóa sản phẩm đang nằm trong bộ sưu tập",
        },
      },
      { status: 409 }
    );
  }

  const dependencyCounts = await getProductDependencyCounts(id);

  if (hasProtectedProductDependencies(dependencyCounts)) {
    return NextResponse.json(
      {
        error: {
          code: "PRODUCT_HAS_HISTORY",
          message: "Không thể xóa sản phẩm còn lịch sử đơn hàng, mã hoặc bulk upload",
          fieldErrors: {
            dependencies: Object.entries(dependencyCounts)
              .filter(([key, count]) => key !== "wishlistCount" && count > 0)
              .map(([key, count]) => `${key}: ${count}`),
          },
        },
      },
      { status: 409 }
    );
  }

  await prisma.product.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}

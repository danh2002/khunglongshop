const prisma = require("../utills/db");
const { asyncHandler, AppError } = require("../utills/errorHandler");
const {
  parseCsvBufferToRows,
  validateRow,
  createBatchWithItems,
  computeBatchStatus,
  getBatchSummary,
  canDeleteProductsForBatch,
  applyItemUpdates,
} = require("../services/bulkUploadService");

// POST /api/bulk-upload
const uploadCsvAndCreateBatch = asyncHandler(async (req, res) => {
  console.log("📦 Bulk upload request received");
  console.log("Files:", req.files);
  console.log("Headers:", req.headers);

  const csvFile = req.files?.file;
  if (!csvFile) {
    console.log("❌ No file uploaded");
    throw new AppError("CSV file is required (field name: 'file')", 400);
  }

  console.log("✅ File received:", csvFile.name, csvFile.size, "bytes");

  const rows = await parseCsvBufferToRows(csvFile.data);
  console.log("📊 Parsed rows:", rows.length);

  if (!rows || rows.length === 0) {
    throw new AppError("CSV has no rows", 400);
  }

  const valid = [];
  const errors = [];
  for (let i = 0; i < rows.length; i++) {
    const { ok, data, error } = validateRow(rows[i]);
    if (ok) valid.push(data);
    else errors.push({ index: i + 1, error });
  }

  console.log("✅ Valid rows:", valid.length);
  console.log("❌ Invalid rows:", errors.length);

  const result = await prisma.$transaction(async (tx) => {
    const createdBatch = await tx.bulk_upload_batch.create({
      data: {
        fileName: csvFile.name,
        status: "PENDING",
        itemCount: rows.length,
        errorCount: errors.length,
      },
    });

    const { successCount, errorCount } = await createBatchWithItems(
      tx,
      createdBatch.id,
      valid,
      errors
    );

    const finalStatus = computeBatchStatus(successCount, errorCount);
    const batch = await tx.bulk_upload_batch.update({
      where: { id: createdBatch.id },
      data: {
        status: finalStatus,
        itemCount: successCount + errorCount,
        errorCount,
      },
    });

    return batch;
  });

  const summary = await getBatchSummary(prisma, result.id);

  return res.status(201).json({
    batchId: result.id,
    status: result.status,
    ...summary,
    validationErrors: errors,
  });
});

// GET /api/bulk-upload
const listBatches = asyncHandler(async (req, res) => {
  const batches = await prisma.bulk_upload_batch.findMany({
    orderBy: { createdAt: "desc" },
  });

  // Get details for each batch
  const batchesWithDetails = await Promise.all(
    batches.map(async (batch) => {
      const items = await prisma.bulk_upload_item.findMany({
        where: { batchId: batch.id },
      });

      const successfulRecords = items.filter(
        (item) => item.status === "CREATED" && item.productId !== null
      ).length;
      const failedRecords = items.filter(
        (item) => item.status === "ERROR" || item.error !== null
      ).length;

      // Collect error messages
      const errors = items
        .filter((item) => item.error)
        .map((item) => item.error);

      return {
        id: batch.id,
        fileName: batch.fileName || `batch-${batch.id.substring(0, 8)}.csv`,
        totalRecords: items.length,
        successfulRecords,
        failedRecords,
        status: batch.status,
        uploadedBy: "Admin", // You can get this from session if needed
        uploadedAt: batch.createdAt,
        errors: errors.length > 0 ? errors : undefined,
      };
    })
  );

  return res.json({ batches: batchesWithDetails });
});

// GET /api/bulk-upload/:batchId
const getBatchDetail = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  if (!batchId) throw new AppError("Batch ID is required", 400);

  const batch = await prisma.bulk_upload_batch.findUnique({
    where: { id: batchId },
  });
  if (!batch) throw new AppError("Batch not found", 404);

  const items = await prisma.bulk_upload_item.findMany({
    where: { batchId },
    include: { product: true },
  });

  return res.json({ batch, items });
});

// PUT /api/bulk-upload/:batchId
const updateBatchItems = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const { items } = req.body;

  if (!batchId) throw new AppError("Batch ID is required", 400);
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError("Items array is required", 400);
  }

  const updated = await prisma.$transaction(async (tx) => {
    return await applyItemUpdates(tx, batchId, items);
  });

  return res.json({ updatedCount: updated.length, items: updated });
});

async function findBatchOrThrow(batchId) {
  const batch = await prisma.bulk_upload_batch.findUnique({
    where: { id: batchId },
  });

  if (!batch) {
    throw new AppError("Batch not found", 404);
  }

  return batch;
}

async function ensureBatchProductsCanBeDeleted(batchId) {
  console.log("🔍 Checking if products can be deleted...");
  const check = await canDeleteProductsForBatch(prisma, batchId);
  console.log("Check result:", check);

  if (check.canDelete) {
    return;
  }

  const errorMsg =
    check.blockedProductIds && check.blockedProductIds.length > 0
      ? `Cannot delete products: ${
          check.reason
        }. Products in orders: ${check.blockedProductIds.join(", ")}`
      : `Cannot delete products: ${check.reason || "Unknown error"}`;

  throw new AppError(errorMsg, 409);
}

async function findProductIdsForBatch(tx, batchId) {
  const items = await tx.bulk_upload_item.findMany({
    where: { batchId, productId: { not: null } },
    select: { productId: true },
  });

  return items.map((item) => item.productId).filter(Boolean);
}

async function deleteBatchProducts(tx, productIds) {
  console.log(`🗑️ Deleting ${productIds.length} products`);

  if (productIds.length > 0) {
    const deletedProducts = await tx.product.deleteMany({
      where: { id: { in: productIds } },
    });
    console.log(`✅ Deleted ${deletedProducts.count} products`);
  }
}

async function deleteBatchItems(tx, batchId) {
  const deletedItems = await tx.bulk_upload_item.deleteMany({
    where: { batchId },
  });
  console.log(`✅ Deleted ${deletedItems.count} items`);
}

async function deleteBatchRecord(tx, batchId) {
  await tx.bulk_upload_batch.delete({
    where: { id: batchId },
  });
  console.log(`✅ Deleted batch`);
}

async function deleteBatchAndProducts(batchId) {
  await prisma.$transaction(async (tx) => {
    const productIds = await findProductIdsForBatch(tx, batchId);
    await deleteBatchProducts(tx, productIds);
    await deleteBatchItems(tx, batchId);
    await deleteBatchRecord(tx, batchId);
  });
}

async function deleteBatchWhileKeepingProducts(batchId) {
  await prisma.$transaction(async (tx) => {
    await deleteBatchItems(tx, batchId);
    await deleteBatchRecord(tx, batchId);
  });
}

// DELETE /api/bulk-upload/:batchId?deleteProducts=true/false
const deleteBatch = asyncHandler(async (req, res) => {
  const { batchId } = req.params;
  const deleteProducts = req.query.deleteProducts === "true";

  if (!batchId) throw new AppError("Batch ID is required", 400);

  console.log(
    `🗑️ Deleting batch ${batchId}, deleteProducts: ${deleteProducts}`
  );

  await findBatchOrThrow(batchId);

  if (deleteProducts) {
    await ensureBatchProductsCanBeDeleted(batchId);
    await deleteBatchAndProducts(batchId);

    console.log(`✅ Batch and products deleted successfully`);
    return res.status(200).json({
      success: true,
      message: "Batch and products deleted successfully",
      deletedProducts: true,
    });
  } else {
    await deleteBatchWhileKeepingProducts(batchId);

    console.log(`✅ Batch deleted (products kept)`);
    return res.status(200).json({
      success: true,
      message: "Batch deleted successfully (products kept)",
      deletedProducts: false,
    });
  }
});

module.exports = {
  uploadCsvAndCreateBatch,
  listBatches,
  getBatchDetail,
  updateBatchItems,
  deleteBatch,
};

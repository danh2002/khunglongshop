import config from "@/lib/config";

export function buildBulkUploadUrl(
  batchId?: string,
  deleteProducts?: boolean
) {
  const baseUrl = config.apiBaseUrl.replace(/\/+$/, "");
  const batchPath = batchId
    ? `/${encodeURIComponent(batchId)}`
    : "";
  const query =
    deleteProducts === undefined
      ? ""
      : `?deleteProducts=${deleteProducts}`;

  return `${baseUrl}/api/bulk-upload${batchPath}${query}`;
}

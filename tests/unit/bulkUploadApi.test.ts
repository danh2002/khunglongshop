import { describe, expect, it } from "vitest";
import { buildBulkUploadUrl } from "@/lib/bulk-upload-api";

describe("bulk upload API URLs", () => {
  it("uses the configured API base URL for the collection endpoint", () => {
    expect(buildBulkUploadUrl()).toBe(
      `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"}/api/bulk-upload`
    );
  });

  it("encodes batch IDs and includes the product deletion choice", () => {
    expect(buildBulkUploadUrl("batch/id", true)).toMatch(
      /\/api\/bulk-upload\/batch%2Fid\?deleteProducts=true$/
    );
  });
});

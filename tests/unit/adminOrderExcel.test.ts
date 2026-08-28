import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import {
  buildAdminOrderExportFilename,
  buildAdminOrderWorkbook,
  type AdminOrderExportItem,
} from "@/lib/adminOrderExport";

const items: AdminOrderExportItem[] = [
  {
    orderNumber: 101,
    name: "An",
    lastname: "Nguyễn",
    email: "an@example.com",
    phone: "0901",
    status: "COMPLETED",
    total: 300_000,
    dateTime: "2026-09-05T08:00:00.000Z",
  },
  {
    orderNumber: 102,
    name: "Bình",
    lastname: "Trần",
    email: "binh@example.com",
    phone: "0902",
    status: "PROCESSING",
    total: 50_000,
    dateTime: null,
  },
  {
    orderNumber: 103,
    name: "Chi",
    lastname: "Lê",
    email: "chi@example.com",
    phone: "0903",
    status: "PENDING_PAYMENT",
    total: 75_000,
    dateTime: "2026-09-06T08:00:00.000Z",
  },
  {
    orderNumber: 104,
    name: "Dũng",
    lastname: "Phạm",
    email: "dung@example.com",
    phone: "0904",
    status: "CANCELLED",
    total: 900_000,
    dateTime: "not-a-date",
  },
];

const exportTime = new Date(2026, 7, 28, 14, 35);

describe("admin order Excel export", () => {
  it("creates the dark corporate order report with serial numbers and frozen headers", () => {
    const workbook = buildAdminOrderWorkbook(ExcelJS, items, exportTime);
    expect(workbook.worksheets.map((sheet) => sheet.name)).toEqual([
      "Tất cả đơn hàng",
      "Tổng hợp doanh thu",
    ]);

    const orders = workbook.getWorksheet("Tất cả đơn hàng")!;
    expect(orders.getCell("H1").isMerged).toBe(true);
    expect(orders.getCell("A1").value).toBe("KHỦNG LONG SHOP");
    expect(orders.getCell("A1").font).toMatchObject({
      name: "Playfair Display",
      bold: true,
      size: 18,
      color: { argb: "FFFF6B00" },
    });
    expect(orders.getCell("A1").fill).toMatchObject({ fgColor: { argb: "FF111111" } });
    expect(orders.getCell("A2").value).toBe("BÁO CÁO ĐƠN HÀNG");
    expect(orders.getCell("A3").value).toBe("Xuất ngày: 28/08/2026 14:35");
    expect(orders.getCell("A4").fill).toMatchObject({ fgColor: { argb: "FF1A1A2E" } });
    expect(orders.getRow(5).values).toEqual([
      undefined,
      "STT",
      "Mã đơn",
      "Khách hàng",
      "Email",
      "SĐT",
      "Trạng thái",
      "Tổng tiền",
      "Ngày đặt",
    ]);
    expect(orders.getCell("A5").fill).toMatchObject({ fgColor: { argb: "FFFF6B00" } });
    expect(orders.views[0]).toMatchObject({ state: "frozen", ySplit: 5, topLeftCell: "A6" });

    expect(orders.getCell("A6").value).toBe(1);
    expect(orders.getCell("B6").value).toBe("#101");
    expect(orders.getCell("B6").font).toMatchObject({
      bold: true,
      color: { argb: "FFFF6B00" },
    });
    expect(orders.getCell("D6").font).toMatchObject({
      size: 10,
      color: { argb: "FF888888" },
    });
    expect(orders.getCell("A6").fill).toMatchObject({ fgColor: { argb: "FF1E1E2E" } });
    expect(orders.getCell("A7").fill).toMatchObject({ fgColor: { argb: "FF252535" } });
    expect(orders.getCell("F6").value).toBe("HOÀN THÀNH");
    expect(orders.getCell("F6").fill).toMatchObject({ fgColor: { argb: "FF1A3A1A" } });
    expect(orders.getCell("F7").fill).toMatchObject({ fgColor: { argb: "FF3A2A00" } });
    expect(orders.getCell("F8").fill).toMatchObject({ fgColor: { argb: "FF1A2A3A" } });
    expect(orders.getCell("F9").fill).toMatchObject({ fgColor: { argb: "FF3A1A1A" } });
    expect(orders.getCell("G6").numFmt).toBe("#,##0");
    expect(orders.getCell("H6").numFmt).toBe("dd/mm/yyyy");
    expect(orders.getCell("H7").value).toBeNull();
    expect(orders.getCell("H9").value).toBeNull();
    expect(orders.columns.map((column) => column.width)).toEqual([
      6,
      14,
      22,
      28,
      18,
      20,
      14,
      14,
    ]);
  });

  it("creates the styled summary with status percentages and revenue separator", () => {
    const workbook = buildAdminOrderWorkbook(ExcelJS, items, exportTime);
    const summary = workbook.getWorksheet("Tổng hợp doanh thu")!;

    expect(summary.getCell("C1").isMerged).toBe(true);
    expect(summary.getCell("A2").value).toBe("TỔNG HỢP DOANH THU");
    expect(summary.getRow(5).values).toEqual([undefined, "Chỉ số", "Giá trị", "Tỷ lệ"]);
    expect(summary.getCell("A5").fill).toMatchObject({ fgColor: { argb: "FFFF6B00" } });
    expect(summary.getCell("B6").value).toBe(4);
    expect(summary.getCell("C6").value).toBe("100.0%");
    expect(summary.getCell("B7").value).toBe(1);
    expect(summary.getCell("C7").value).toBe("25.0%");
    expect(summary.getCell("C8").value).toBe("25.0%");
    expect(summary.getCell("C9").value).toBe("25.0%");
    expect(summary.getCell("C10").value).toBe("25.0%");
    expect(summary.getCell("A7").font).toMatchObject({ color: { argb: "FF4CAF50" } });
    expect(summary.getCell("A8").font).toMatchObject({ color: { argb: "FFFFC107" } });
    expect(summary.getCell("A9").font).toMatchObject({ color: { argb: "FF2196F3" } });
    expect(summary.getCell("A10").font).toMatchObject({ color: { argb: "FFF44336" } });
    expect(summary.getCell("C11").isMerged).toBe(true);
    expect(summary.getCell("A11").fill).toMatchObject({ fgColor: { argb: "FFFF6B00" } });
    expect(summary.getRow(11).height).toBe(4);
    expect(summary.getCell("B12").value).toBe(300_000);
    expect(summary.getCell("B12").numFmt).toBe("#,##0");
    expect(summary.getCell("B12").font).toMatchObject({
      bold: true,
      size: 14,
      color: { argb: "FF4CAF50" },
    });
    expect(summary.getCell("B13").value).toBe(300_000);
    expect(summary.getCell("C12").value).toBe("");
    expect(summary.columns.map((column) => column.width)).toEqual([35, 20, 12]);
  });

  it("uses zero percentages and revenue when there are no orders", () => {
    const summary = buildAdminOrderWorkbook(ExcelJS, [], exportTime).getWorksheet(
      "Tổng hợp doanh thu"
    )!;
    expect(summary.getCell("B6").value).toBe(0);
    expect(summary.getCell("C7").value).toBe("0.0%");
    expect(summary.getCell("B12").value).toBe(0);
    expect(summary.getCell("B13").value).toBe(0);
  });

  it("serializes merged cells, freeze panes, and styles intact", async () => {
    const workbook = buildAdminOrderWorkbook(ExcelJS, items, exportTime);
    const buffer = await workbook.xlsx.writeBuffer();
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(buffer);
    const orders = loaded.getWorksheet("Tất cả đơn hàng")!;
    expect(orders.getCell("H1").isMerged).toBe(true);
    expect(orders.views[0]).toMatchObject({ state: "frozen", ySplit: 5 });
    expect(orders.getCell("F6").font).toMatchObject({ color: { argb: "FF4CAF50" } });
  });

  it("builds the required date-based filename", () => {
    expect(buildAdminOrderExportFilename(new Date(2026, 8, 5))).toBe(
      "bao-cao-don-hang-05-09-2026.xlsx"
    );
  });

  it("keeps generation browser-side and preserves current filters", () => {
    const button = readFileSync(
      resolve(process.cwd(), "components/admin/OrderExportButton.tsx"),
      "utf8"
    );
    const page = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/admin/orders/page.tsx"),
      "utf8"
    );
    expect(button).toContain('await import("exceljs")');
    expect(button).toContain("await workbook.xlsx.writeBuffer()");
    expect(button).toContain(
      'fetch(`/api/admin/orders/export${query ? `?${query}` : ""}`'
    );
    expect(button).not.toContain('params.set("page"');
    expect(button).not.toContain('params.set("limit"');
    expect(page).toContain("<OrderExportButton");
    expect(page).toContain("dateFrom={dateFrom}");
    expect(page).toContain("dateTo={dateTo}");
  });
});

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as XLSX from "xlsx";
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
    phone: "0901000001",
    status: "COMPLETED",
    total: 300_000,
    dateTime: "2026-09-05T08:00:00.000Z",
  },
  {
    orderNumber: 102,
    name: "Bình",
    lastname: "Trần",
    email: "binh@example.com",
    phone: "0901000002",
    status: "COMPLETED",
    total: 100_000,
    dateTime: null,
  },
  {
    orderNumber: 103,
    name: "Chi",
    lastname: "Lê",
    email: "chi@example.com",
    phone: "0901000003",
    status: "PROCESSING",
    total: 50_000,
    dateTime: "2026-09-06T08:00:00.000Z",
  },
  {
    orderNumber: 104,
    name: "Dũng",
    lastname: "Phạm",
    email: "dung@example.com",
    phone: "0901000004",
    status: "PENDING_PAYMENT",
    total: 75_000,
    dateTime: "2026-09-07T08:00:00.000Z",
  },
  {
    orderNumber: 105,
    name: "Em",
    lastname: "Võ",
    email: "em@example.com",
    phone: "0901000005",
    status: "CANCELLED",
    total: 900_000,
    dateTime: "not-a-date",
  },
];

function sheetRows(workbook: XLSX.WorkBook, name: string) {
  return XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name]!, {
    header: 1,
    raw: true,
    defval: "",
  });
}

describe("admin order Excel export", () => {
  it("creates both sheets in the required order with mapped order columns", () => {
    const workbook = buildAdminOrderWorkbook(XLSX, items);
    expect(workbook.SheetNames).toEqual(["Tất cả đơn hàng", "Tổng hợp doanh thu"]);

    const rows = sheetRows(workbook, "Tất cả đơn hàng");
    expect(rows[0]).toEqual([
      "Mã đơn",
      "Khách hàng",
      "Email",
      "SĐT",
      "Trạng thái",
      "Tổng tiền",
      "Ngày đặt",
    ]);
    expect(rows[1]?.slice(0, 6)).toEqual([
      "#101",
      "An Nguyễn",
      "an@example.com",
      "0901000001",
      "Hoàn thành",
      300_000,
    ]);
    expect(rows[2]?.[6]).toBe("");
    expect(rows[5]?.[6]).toBe("");
  });

  it("counts every status but includes only completed orders in revenue", () => {
    const rows = sheetRows(buildAdminOrderWorkbook(XLSX, items), "Tổng hợp doanh thu");
    expect(rows).toEqual([
      ["Chỉ số", "Giá trị"],
      ["Tổng đơn hàng", 5],
      ["Tổng đơn thành công", 2],
      ["Tổng đơn đang xử lý", 1],
      ["Tổng đơn chờ thanh toán", 1],
      ["Tổng đơn đã huỷ", 1],
      ["Tổng doanh thu", 400_000],
      ["Doanh thu trung bình/đơn thành công", 200_000],
    ]);
  });

  it("uses numeric zero when there are no completed orders", () => {
    const rows = sheetRows(
      buildAdminOrderWorkbook(XLSX, items.filter((item) => item.status !== "COMPLETED")),
      "Tổng hợp doanh thu"
    );
    expect(rows[6]?.[1]).toBe(0);
    expect(rows[7]?.[1]).toBe(0);
  });

  it("builds the required date-based filename", () => {
    expect(buildAdminOrderExportFilename(new Date(2026, 8, 5))).toBe(
      "don-hang-05-09-2026.xlsx"
    );
  });

  it("keeps the export browser-side and wires current filters without pagination", () => {
    const button = readFileSync(
      resolve(process.cwd(), "components/admin/OrderExportButton.tsx"),
      "utf8"
    );
    const page = readFileSync(
      resolve(process.cwd(), "app/(dashboard)/admin/orders/page.tsx"),
      "utf8"
    );

    expect(button).toContain('await import("xlsx")');
    expect(button).toContain('fetch(`/api/admin/orders/export${query ? `?${query}` : ""}`');
    expect(button).not.toContain('params.set("page"');
    expect(button).not.toContain('params.set("limit"');
    expect(page).toContain("<OrderExportButton");
    expect(page).toContain("dateFrom={dateFrom}");
    expect(page).toContain("dateTo={dateTo}");
  });
});

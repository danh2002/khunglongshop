import type { Border, Fill, Font, Workbook, Worksheet } from "exceljs";

export type AdminOrderExportItem = {
  orderNumber: number;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  status: "PENDING_PAYMENT" | "PROCESSING" | "COMPLETED" | "CANCELLED";
  total: number;
  dateTime: string | null;
};

type ExcelJs = typeof import("exceljs");

const COLORS = {
  background: "FF1A1A2E",
  border: "FF333333",
  cancelled: "FFF44336",
  cancelledFill: "FF3A1A1A",
  completed: "FF4CAF50",
  completedFill: "FF1A3A1A",
  email: "FF888888",
  evenRow: "FF252535",
  orange: "FFFF6B00",
  pending: "FF2196F3",
  pendingFill: "FF1A2A3A",
  processing: "FFFFC107",
  processingFill: "FF3A2A00",
  primaryText: "FFE0E0E0",
  titleBackground: "FF111111",
  white: "FFFFFFFF",
  oddRow: "FF1E1E2E",
} as const;

const STATUS_LABEL: Record<AdminOrderExportItem["status"], string> = {
  PENDING_PAYMENT: "CHỜ THANH TOÁN",
  PROCESSING: "ĐANG XỬ LÝ",
  COMPLETED: "HOÀN THÀNH",
  CANCELLED: "ĐÃ HUỶ",
};

const STATUS_STYLE: Record<AdminOrderExportItem["status"], { fill: string; text: string }> = {
  PENDING_PAYMENT: { fill: COLORS.pendingFill, text: COLORS.pending },
  PROCESSING: { fill: COLORS.processingFill, text: COLORS.processing },
  COMPLETED: { fill: COLORS.completedFill, text: COLORS.completed },
  CANCELLED: { fill: COLORS.cancelledFill, text: COLORS.cancelled },
};

const thinBorder: Partial<Border> = {
  style: "thin",
  color: { argb: COLORS.border },
};

const allBorders = {
  top: thinBorder,
  left: thinBorder,
  bottom: thinBorder,
  right: thinBorder,
};

function solidFill(argb: string): Fill {
  return { type: "pattern", pattern: "solid", fgColor: { argb } };
}

function parseOrderDate(dateTime: string | null): Date | null {
  if (!dateTime) return null;
  const date = new Date(dateTime);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatExportTime(now: Date): string {
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${now.getFullYear()} ${hours}:${minutes}`;
}

function styleReportHeader(
  worksheet: Worksheet,
  lastColumn: string,
  reportTitle: string,
  now: Date
) {
  for (const rowNumber of [1, 2, 3]) {
    worksheet.mergeCells(`A${rowNumber}:${lastColumn}${rowNumber}`);
  }

  const brandCell = worksheet.getCell("A1");
  brandCell.value = "KHỦNG LONG SHOP";
  brandCell.font = {
    name: "Playfair Display",
    size: 18,
    bold: true,
    color: { argb: COLORS.orange },
  };
  brandCell.fill = solidFill(COLORS.titleBackground);
  brandCell.alignment = { horizontal: "center", vertical: "middle" };

  const titleCell = worksheet.getCell("A2");
  titleCell.value = reportTitle;
  titleCell.font = { size: 13, bold: true, color: { argb: COLORS.white } };
  titleCell.fill = solidFill(COLORS.background);
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  const exportedAtCell = worksheet.getCell("A3");
  exportedAtCell.value = `Xuất ngày: ${formatExportTime(now)}`;
  exportedAtCell.font = { size: 10, color: { argb: COLORS.email } };
  exportedAtCell.fill = solidFill(COLORS.background);
  exportedAtCell.alignment = { horizontal: "center", vertical: "middle" };

  for (let column = 1; column <= worksheet.getColumn(lastColumn).number; column += 1) {
    worksheet.getRow(4).getCell(column).fill = solidFill(COLORS.background);
  }

  worksheet.getRow(1).height = 28;
  worksheet.getRow(2).height = 22;
  worksheet.getRow(3).height = 18;
  worksheet.getRow(4).height = 8;
}

function styleTableHeader(worksheet: Worksheet, rowNumber: number, columnCount: number) {
  const row = worksheet.getRow(rowNumber);
  for (let column = 1; column <= columnCount; column += 1) {
    const cell = row.getCell(column);
    cell.fill = solidFill(COLORS.orange);
    cell.font = { size: 11, bold: true, color: { argb: COLORS.white } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = allBorders;
  }
  row.height = 24;
}

function styleDarkDataRow(worksheet: Worksheet, rowNumber: number, columnCount: number) {
  const row = worksheet.getRow(rowNumber);
  const fill = solidFill(rowNumber % 2 === 0 ? COLORS.oddRow : COLORS.evenRow);
  for (let column = 1; column <= columnCount; column += 1) {
    const cell = row.getCell(column);
    cell.fill = fill;
    cell.font = { color: { argb: COLORS.primaryText } };
    cell.alignment = { vertical: "middle" };
    cell.border = allBorders;
  }
  row.height = 22;
}

function percentage(count: number, total: number): string {
  return `${(total ? (count / total) * 100 : 0).toFixed(1)}%`;
}

export function buildAdminOrderWorkbook(
  ExcelJS: ExcelJs,
  items: AdminOrderExportItem[],
  now = new Date()
): Workbook {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Khủng Long Shop";
  workbook.created = now;

  const ordersSheet = workbook.addWorksheet("Tất cả đơn hàng", {
    views: [{ state: "frozen", ySplit: 5, topLeftCell: "A6", activeCell: "A6" }],
  });
  styleReportHeader(ordersSheet, "H", "BÁO CÁO ĐƠN HÀNG", now);
  ordersSheet.getRow(5).values = [
    "STT",
    "Mã đơn",
    "Khách hàng",
    "Email",
    "SĐT",
    "Trạng thái",
    "Tổng tiền",
    "Ngày đặt",
  ];
  styleTableHeader(ordersSheet, 5, 8);

  items.forEach((item, index) => {
    const row = ordersSheet.addRow([
      index + 1,
      `#${item.orderNumber}`,
      `${item.name} ${item.lastname}`.trim(),
      item.email,
      item.phone,
      STATUS_LABEL[item.status],
      item.total,
      parseOrderDate(item.dateTime),
    ]);
    styleDarkDataRow(ordersSheet, row.number, 8);

    row.getCell(1).font = { color: { argb: COLORS.email } };
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).font = { bold: true, color: { argb: COLORS.orange } };
    row.getCell(4).font = { size: 10, color: { argb: COLORS.email } };

    const statusStyle = STATUS_STYLE[item.status];
    row.getCell(6).fill = solidFill(statusStyle.fill);
    row.getCell(6).font = { bold: true, color: { argb: statusStyle.text } };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };

    row.getCell(7).font = { bold: true, color: { argb: COLORS.completed } };
    row.getCell(7).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(7).numFmt = "#,##0";
    row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(8).numFmt = "dd/mm/yyyy";
  });

  [6, 14, 22, 28, 18, 20, 14, 14].forEach((width, index) => {
    ordersSheet.getColumn(index + 1).width = width;
  });

  const completedCount = items.filter((item) => item.status === "COMPLETED").length;
  const processingCount = items.filter((item) => item.status === "PROCESSING").length;
  const pendingCount = items.filter((item) => item.status === "PENDING_PAYMENT").length;
  const cancelledCount = items.filter((item) => item.status === "CANCELLED").length;
  const completedRevenue = items
    .filter((item) => item.status === "COMPLETED")
    .reduce((sum, item) => sum + item.total, 0);

  const summarySheet = workbook.addWorksheet("Tổng hợp doanh thu");
  styleReportHeader(summarySheet, "C", "TỔNG HỢP DOANH THU", now);
  summarySheet.getRow(5).values = ["Chỉ số", "Giá trị", "Tỷ lệ"];
  styleTableHeader(summarySheet, 5, 3);

  const summaryRows: Array<[string, number, string, string?]> = [
    ["Tổng đơn hàng", items.length, "100.0%"],
    ["Tổng đơn thành công", completedCount, percentage(completedCount, items.length), COLORS.completed],
    ["Tổng đơn đang xử lý", processingCount, percentage(processingCount, items.length), COLORS.processing],
    ["Tổng đơn chờ thanh toán", pendingCount, percentage(pendingCount, items.length), COLORS.pending],
    ["Tổng đơn đã huỷ", cancelledCount, percentage(cancelledCount, items.length), COLORS.cancelled],
  ];

  for (const [label, value, ratio, color] of summaryRows) {
    const row = summarySheet.addRow([label, value, ratio]);
    styleDarkDataRow(summarySheet, row.number, 3);
    row.getCell(1).font = { bold: true, color: { argb: color ?? COLORS.primaryText } };
    row.getCell(2).font = { color: { argb: color ?? COLORS.primaryText } };
    row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(3).font = { color: { argb: color ?? COLORS.primaryText } };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
  }

  const separatorRow = summarySheet.addRow([]);
  summarySheet.mergeCells(`A${separatorRow.number}:C${separatorRow.number}`);
  separatorRow.getCell(1).fill = solidFill(COLORS.orange);
  separatorRow.height = 4;

  const revenueRows: Array<[string, number, boolean]> = [
    ["Tổng doanh thu", completedRevenue, true],
    ["Doanh thu TB/đơn", completedCount ? completedRevenue / completedCount : 0, false],
  ];
  for (const [label, value, isTotal] of revenueRows) {
    const row = summarySheet.addRow([label, value, ""]);
    styleDarkDataRow(summarySheet, row.number, 3);
    const font: Partial<Font> = {
      bold: isTotal,
      size: isTotal ? 14 : 11,
      color: { argb: COLORS.completed },
    };
    row.getCell(1).font = font;
    row.getCell(2).font = font;
    row.getCell(2).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(2).numFmt = "#,##0";
  }

  summarySheet.getColumn(1).width = 35;
  summarySheet.getColumn(2).width = 20;
  summarySheet.getColumn(3).width = 12;

  return workbook;
}

export function buildAdminOrderExportFilename(now = new Date()): string {
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `bao-cao-don-hang-${day}-${month}-${now.getFullYear()}.xlsx`;
}

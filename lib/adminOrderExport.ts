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

type SheetJs = typeof import("xlsx");

const STATUS_LABEL: Record<AdminOrderExportItem["status"], string> = {
  PENDING_PAYMENT: "Chờ thanh toán",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã huỷ",
};

function parseOrderDate(dateTime: string | null): Date | "" {
  if (!dateTime) return "";

  const date = new Date(dateTime);
  return Number.isNaN(date.getTime()) ? "" : date;
}

export function buildAdminOrderWorkbook(
  XLSX: SheetJs,
  items: AdminOrderExportItem[]
) {
  const orderRows = [
    ["Mã đơn", "Khách hàng", "Email", "SĐT", "Trạng thái", "Tổng tiền", "Ngày đặt"],
    ...items.map((item) => [
      `#${item.orderNumber}`,
      `${item.name} ${item.lastname}`.trim(),
      item.email,
      item.phone,
      STATUS_LABEL[item.status],
      item.total,
      parseOrderDate(item.dateTime),
    ]),
  ];
  const completedOrders = items.filter((item) => item.status === "COMPLETED");
  const completedRevenue = completedOrders.reduce((sum, item) => sum + item.total, 0);
  const summaryRows = [
    ["Chỉ số", "Giá trị"],
    ["Tổng đơn hàng", items.length],
    ["Tổng đơn thành công", completedOrders.length],
    ["Tổng đơn đang xử lý", items.filter((item) => item.status === "PROCESSING").length],
    [
      "Tổng đơn chờ thanh toán",
      items.filter((item) => item.status === "PENDING_PAYMENT").length,
    ],
    ["Tổng đơn đã huỷ", items.filter((item) => item.status === "CANCELLED").length],
    ["Tổng doanh thu", completedRevenue],
    [
      "Doanh thu trung bình/đơn thành công",
      completedOrders.length ? completedRevenue / completedOrders.length : 0,
    ],
  ];

  const ordersSheet = XLSX.utils.aoa_to_sheet(orderRows, { cellDates: true });
  ordersSheet["!cols"] = [
    { wch: 14 },
    { wch: 24 },
    { wch: 28 },
    { wch: 16 },
    { wch: 20 },
    { wch: 16 },
    { wch: 18 },
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
  summarySheet["!cols"] = [{ wch: 40 }, { wch: 18 }];

  for (let row = 2; row <= items.length + 1; row += 1) {
    const totalCell = ordersSheet[`F${row}`];
    const dateCell = ordersSheet[`G${row}`];
    if (totalCell) totalCell.z = "#,##0";
    if (dateCell?.v instanceof Date) dateCell.z = "dd/mm/yyyy";
  }
  for (let row = 2; row <= summaryRows.length; row += 1) {
    const valueCell = summarySheet[`B${row}`];
    if (valueCell) valueCell.z = "#,##0";
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ordersSheet, "Tất cả đơn hàng");
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Tổng hợp doanh thu");
  return workbook;
}

export function buildAdminOrderExportFilename(now = new Date()): string {
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  return `don-hang-${day}-${month}-${now.getFullYear()}.xlsx`;
}

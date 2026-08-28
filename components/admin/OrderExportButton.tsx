"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import {
  buildAdminOrderExportFilename,
  buildAdminOrderWorkbook,
  type AdminOrderExportItem,
} from "@/lib/adminOrderExport";
import { adminSecondaryButtonClass } from "./AdminUi";

type OrderExportButtonProps = {
  search: string;
  status?: string;
  dateFrom: string;
  dateTo: string;
};

type ExportResponse = {
  items?: AdminOrderExportItem[];
  error?: { message?: string };
};

export default function OrderExportButton({
  search,
  status,
  dateFrom,
  dateTo,
}: OrderExportButtonProps) {
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);

    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (status) params.set("status", status);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const query = params.toString();
      const response = await fetch(`/api/admin/orders/export${query ? `?${query}` : ""}`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => null)) as ExportResponse | null;

      if (!response.ok || !Array.isArray(payload?.items)) {
        throw new Error(payload?.error?.message || "Không thể xuất đơn hàng.");
      }

      const ExcelJS = await import("exceljs");
      const workbook = buildAdminOrderWorkbook(ExcelJS, payload.items);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = buildAdminOrderExportFilename();
      link.click();
      URL.revokeObjectURL(url);
      toast.success("Đã xuất danh sách đơn hàng.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xuất đơn hàng.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <button
      className={adminSecondaryButtonClass}
      type="button"
      disabled={isExporting}
      onClick={handleExport}
    >
      {isExporting ? "Đang xuất..." : "Xuất Excel"}
    </button>
  );
}

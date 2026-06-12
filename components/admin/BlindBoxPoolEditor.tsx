"use client";

import type { RarityTier } from "@prisma/client";
import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminInputClass, adminSecondaryButtonClass } from "./AdminUi";

type PoolEntry = {
  id: string;
  productId: string;
  slotNumber: number;
  drawWeight: number;
  rarityTier: RarityTier;
  product: { title: string };
};

type PoolVersion = {
  id: string;
  version: number;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED";
  publishedAt: string | null;
  entries: PoolEntry[];
};

const rarityOptions: RarityTier[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export default function BlindBoxPoolEditor({ collectorSetId }: { collectorSetId: string }) {
  const [versions, setVersions] = useState<PoolVersion[]>([]);
  const [draft, setDraft] = useState<PoolVersion | null>(null);
  const [busy, setBusy] = useState(false);

  const loadVersions = useCallback(async () => {
    const response = await fetch(`/api/admin/collector-sets/${collectorSetId}/pool-versions`, {
      cache: "no-store",
    });
    if (!response.ok) {
      toast.error("Không thể tải phiên bản tỷ lệ.");
      return;
    }
    const data = (await response.json()) as PoolVersion[];
    setVersions(data);
    setDraft(data.find((version) => version.status === "DRAFT") ?? null);
  }, [collectorSetId]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);

  const totalWeight = useMemo(
    () => draft?.entries.reduce((sum, entry) => sum + entry.drawWeight, 0) ?? 0,
    [draft]
  );
  const active = versions.find((version) => version.status === "ACTIVE");
  const activeTotalWeight =
    active?.entries.reduce((sum, entry) => sum + entry.drawWeight, 0) ?? 0;

  async function createDraft() {
    setBusy(true);
    const response = await fetch(`/api/admin/collector-sets/${collectorSetId}/pool-versions`, {
      method: "POST",
    });
    setBusy(false);
    if (!response.ok) {
      toast.error("Không thể tạo bản nháp tỷ lệ.");
      return;
    }
    toast.success("Đã tạo bản nháp từ phiên bản đang hoạt động.");
    await loadVersions();
  }

  function updateEntry(id: string, patch: Partial<PoolEntry>) {
    setDraft((current) =>
      current
        ? {
            ...current,
            entries: current.entries.map((entry) =>
              entry.id === id ? { ...entry, ...patch } : entry
            ),
          }
        : current
    );
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy(true);
    const response = await fetch(`/api/admin/pool-versions/${draft.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        entries: draft.entries.map(({ productId, slotNumber, drawWeight, rarityTier }) => ({
          productId,
          slotNumber,
          drawWeight,
          rarityTier,
        })),
      }),
    });
    const body = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Phiên bản tỷ lệ chưa hợp lệ.");
      return;
    }
    toast.success("Đã lưu bản nháp.");
    await loadVersions();
  }

  async function publishDraft() {
    if (!draft || !window.confirm("Xuất bản tỷ lệ này cho các đơn hàng mới?")) return;
    setBusy(true);
    const response = await fetch("/api/admin/blind-box/pool/publish", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ poolVersionId: draft.id }),
    });
    const body = await response.json().catch(() => null);
    setBusy(false);
    if (!response.ok) {
      toast.error(body?.error?.message ?? "Không thể xuất bản phiên bản tỷ lệ.");
      return;
    }
    toast.success("Đã xuất bản phiên bản tỷ lệ mới.");
    await loadVersions();
  }

  return (
    <section className="mt-8 border border-white/10 bg-[#0f0f0f] p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-black uppercase text-white">Tỷ lệ túi mù</h2>
          <p className="mt-1 text-sm text-white/50">
            Phiên bản hoạt động: {active ? `v${active.version}` : "chưa có"}
          </p>
        </div>
        {!draft ? (
          <button className={adminSecondaryButtonClass} disabled={busy} onClick={createDraft} type="button">
            Tạo bản nháp
          </button>
        ) : null}
      </div>

      {draft ? (
        <>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[680px] text-left text-sm">
              <thead className="text-xs uppercase text-white/45">
                <tr>
                  <th className="p-2">Mẫu</th>
                  <th className="p-2">Slot</th>
                  <th className="p-2">Trọng số</th>
                  <th className="p-2">Độ hiếm</th>
                </tr>
              </thead>
              <tbody>
                {draft.entries.map((entry) => (
                  <tr className="border-t border-white/5" key={entry.id}>
                    <td className="p-2 font-bold text-white">{entry.product.title}</td>
                    <td className="p-2 text-white/65">{entry.slotNumber}</td>
                    <td className="p-2">
                      <input
                        className={adminInputClass}
                        min={1}
                        max={1_000_000}
                        type="number"
                        value={entry.drawWeight}
                        onChange={(event) =>
                          updateEntry(entry.id, { drawWeight: Number(event.target.value) })
                        }
                      />
                    </td>
                    <td className="p-2">
                      <select
                        className={adminInputClass}
                        value={entry.rarityTier}
                        onChange={(event) =>
                          updateEntry(entry.id, { rarityTier: event.target.value as RarityTier })
                        }
                      >
                        {rarityOptions.map((rarity) => (
                          <option key={rarity} value={rarity}>{rarity}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#e85d00]">
              Tổng trọng số: {totalWeight.toLocaleString("vi-VN")}
            </p>
            <div className="flex gap-3">
              <button className={adminSecondaryButtonClass} disabled={busy} onClick={saveDraft} type="button">
                Lưu bản nháp
              </button>
              <button
                className="min-h-10 border border-[#e85d00] bg-[#e85d00] px-4 text-sm font-black uppercase text-white disabled:opacity-50"
                disabled={busy}
                onClick={publishDraft}
                type="button"
              >
                Xuất bản
              </button>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-5 text-sm text-white/45">
          Tạo bản nháp để điều chỉnh tỷ lệ cho các đơn hàng tương lai.
        </p>
      )}

      {active && activeTotalWeight > 0 ? (
        <div className="mt-8">
          <h3 className="font-black uppercase text-white">Tỷ lệ phiên bản đang hoạt động</h3>
          <div className="mt-3 grid gap-2 md:grid-cols-2">
            {active.entries.map((entry) => (
              <div
                className="flex items-center justify-between border border-white/10 bg-black px-3 py-2 text-sm"
                key={entry.id}
              >
                <span className="font-bold text-white">
                  Slot {entry.slotNumber} · {entry.product.title}
                </span>
                <span className="text-[#e85d00]">
                  {entry.drawWeight.toLocaleString("vi-VN")} ·{" "}
                  {((entry.drawWeight / activeTotalWeight) * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-8">
        <h3 className="font-black uppercase text-white">Lịch sử phiên bản</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="text-xs uppercase text-white/45">
              <tr>
                <th className="p-3">Phiên bản</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3">Ngày xuất bản</th>
                <th className="p-3">Tổng trọng số</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((version) => {
                const versionTotal = version.entries.reduce(
                  (sum, entry) => sum + entry.drawWeight,
                  0
                );
                const isActive = version.status === "ACTIVE";
                return (
                  <tr
                    className={`border-t border-white/5 ${
                      isActive ? "bg-[#e85d00]/10 text-[#e85d00]" : "text-white/70"
                    }`}
                    key={version.id}
                  >
                    <td className="p-3 font-black">v{version.version}</td>
                    <td className="p-3">{version.status}</td>
                    <td className="p-3">
                      {version.publishedAt
                        ? new Date(version.publishedAt).toLocaleString("vi-VN")
                        : "-"}
                    </td>
                    <td className="p-3">{versionTotal.toLocaleString("vi-VN")}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

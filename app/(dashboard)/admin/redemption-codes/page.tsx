import { Prisma, RedemptionCodeStatus } from "@prisma/client";
import Link from "next/link";
import {
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTh,
  adminInputClass,
  adminSecondaryButtonClass,
} from "@/components/admin/AdminUi";
import DisableCodeButton from "@/components/admin/DisableCodeButton";
import prisma from "@/utils/db";

const PAGE_SIZE = 20;

export default async function RedemptionCodesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const page = Math.max(Number(params.page ?? 1), 1);
  const search = typeof params.search === "string" ? params.search.trim() : "";
  const rawStatus = typeof params.status === "string" ? params.status : "";
  const status = Object.values(RedemptionCodeStatus).includes(rawStatus as RedemptionCodeStatus)
    ? (rawStatus as RedemptionCodeStatus)
    : undefined;
  const setId = typeof params.set === "string" ? params.set : "";
  const where: Prisma.RedemptionCodeWhereInput = {
    ...(status ? { status } : {}),
    ...(setId ? { product: { setId } } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { product: { title: { contains: search } } },
            { user: { email: { contains: search } } },
          ],
        }
      : {}),
  };
  const [codes, total, sets] = await Promise.all([
    prisma.redemptionCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        product: { include: { set: true } },
        user: { select: { email: true } },
      },
    }),
    prisma.redemptionCode.count({ where }),
    prisma.collectorSet.findMany({ orderBy: { name: "asc" } }),
  ]);
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <AdminPage>
      <AdminPageHeader title="Mã mở khóa" description={`${total} mã phù hợp bộ lọc.`} />
      <form className="mb-5 flex flex-wrap gap-3">
        <input className={`${adminInputClass} min-w-[240px] flex-1`} name="search" defaultValue={search} placeholder="Code, sản phẩm hoặc email" />
        <select className={adminInputClass} name="set" defaultValue={setId}>
          <option value="">Tất cả bộ sưu tập</option>
          {sets.map((set) => <option key={set.id} value={set.id}>{set.name}</option>)}
        </select>
        <select className={adminInputClass} name="status" defaultValue={status ?? ""}>
          <option value="">Tất cả trạng thái</option>
          {Object.values(RedemptionCodeStatus).map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button className={adminSecondaryButtonClass} type="submit">Lọc</button>
      </form>
      {codes.length ? (
        <AdminTable>
          <thead><tr><AdminTh>Code</AdminTh><AdminTh>Sản phẩm</AdminTh><AdminTh>Bộ / slot</AdminTh><AdminTh>Owner</AdminTh><AdminTh>Trạng thái</AdminTh><AdminTh>Ngày</AdminTh><AdminTh /></tr></thead>
          <tbody>
            {codes.map((code) => (
              <tr key={code.id}>
                <AdminTd className="font-mono">{code.code}</AdminTd>
                <AdminTd>{code.product.title}</AdminTd>
                <AdminTd>{code.product.set ? `${code.product.set.name} / ${code.product.setSlotNumber ?? "-"}` : "-"}</AdminTd>
                <AdminTd>{code.user?.email ?? "Chưa gán"}</AdminTd>
                <AdminTd><AdminStatusBadge tone={code.status === "REDEEMED" ? "success" : code.status === "DISABLED" ? "danger" : "warning"}>{code.status}</AdminStatusBadge></AdminTd>
                <AdminTd>{code.createdAt.toLocaleDateString("vi-VN")}</AdminTd>
                <AdminTd>{code.status === "ACTIVE" ? <DisableCodeButton id={code.id} /> : null}</AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : <AdminEmptyState>Không có mã phù hợp.</AdminEmptyState>}
      <nav className="mt-5 flex gap-4 text-sm text-[#e85d00]">
        {page > 1 ? <Link href={`?page=${page - 1}`}>Trang trước</Link> : null}
        <span className="text-white/45">Trang {page}/{totalPages}</span>
        {page < totalPages ? <Link href={`?page=${page + 1}`}>Trang sau</Link> : null}
      </nav>
    </AdminPage>
  );
}

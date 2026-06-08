import AdminConfirmSubmit from "@/components/AdminConfirmSubmit";
import prisma from "@/utils/db";
import Link from "next/link";
import { revalidatePath } from "next/cache";

const PAGE_SIZE = 20;

async function disableRedemptionCode(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  await prisma.redemptionCode.update({
    where: { id },
    data: { isUsed: true, usedAt: new Date() },
  });
  revalidatePath("/admin/redemption-codes");
}

export default async function RedemptionCodesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page || 1);
  const setId = typeof sp.set === "string" ? sp.set : "";
  const isUsed = typeof sp.isUsed === "string" ? sp.isUsed : "all";
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const sets = await prisma.collectorSet.findMany({ orderBy: { name: "asc" } });

  const productFilter = setId ? await prisma.product.findMany({ where: { setId }, select: { id: true } }) : [];
  const userFilter = search
    ? await prisma.user.findMany({
        where: { email: { contains: search } },
        select: { id: true },
      })
    : [];

  const where: any = {};
  if (setId) where.productId = { in: productFilter.map((product) => product.id) };
  if (isUsed === "active") where.isUsed = false;
  if (isUsed === "used") where.isUsed = true;
  if (search) {
    where.OR = [
      { code: { contains: search } },
      { userId: { in: userFilter.map((user) => user.id) } },
    ];
  }

  const [codes, total] = await Promise.all([
    prisma.redemptionCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.redemptionCode.count({ where }),
  ]);
  const products = await prisma.product.findMany({
    where: { id: { in: [...new Set(codes.map((code) => code.productId))] } },
    select: { id: true, title: true, setId: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(codes.map((code) => code.userId))] } },
    select: { id: true, email: true },
  });
  const productById = new Map(products.map((product) => [product.id, product]));
  const userById = new Map(users.map((user) => [user.id, user]));
  const setById = new Map(sets.map((set) => [set.id, set]));
  const totalPages = Math.max(Math.ceil(total / PAGE_SIZE), 1);

  return (
    <div className="bg-white flex justify-start max-w-screen-2xl mx-auto h-full max-xl:flex-col">
      <div className="flex flex-col gap-y-6 xl:ml-5 w-full max-xl:px-5">
        <h1 className="text-3xl font-semibold">Redemption Codes</h1>

        <form className="flex flex-wrap gap-3 items-end">
          <label className="grid gap-1">
            <span>Set</span>
            <select name="set" defaultValue={setId} className="select select-bordered">
              <option value="">All</option>
              {sets.map((set) => (
                <option key={set.id} value={set.id}>
                  {set.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span>Status</span>
            <select name="isUsed" defaultValue={isUsed} className="select select-bordered">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="used">Used</option>
            </select>
          </label>
          <label className="grid gap-1">
            <span>Search</span>
            <input name="search" defaultValue={search} placeholder="Code or user email" className="input input-bordered" />
          </label>
          <button className="bg-blue-500 text-white px-6 py-3 font-bold hover:bg-blue-600" type="submit">
            Filter
          </button>
        </form>

        <div className="overflow-x-auto bg-white shadow-md">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Set</th>
                <th>User</th>
                <th>Order ID</th>
                <th>Used</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const product = productById.get(code.productId);
                const set = product?.setId ? setById.get(product.setId) : null;
                const user = userById.get(code.userId);
                return (
                  <tr key={code.id}>
                    <td className="font-mono">{code.code}</td>
                    <td>{product?.title || "N/A"}</td>
                    <td>{set?.name || "N/A"}</td>
                    <td>{user?.email || code.userId}</td>
                    <td className="font-mono">{code.orderId}</td>
                    <td>{code.isUsed ? "Yes" : "No"}</td>
                    <td>{code.createdAt.toLocaleDateString()}</td>
                    <td>
                      {!code.isUsed && (
                        <form action={disableRedemptionCode}>
                          <input type="hidden" name="id" value={code.id} />
                          <AdminConfirmSubmit message="Vô hiệu hóa mã này?" className="text-red-600 hover:underline">
                            VÔ HIỆU HÓA
                          </AdminConfirmSubmit>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex gap-3">
          {page > 1 && <Link className="text-blue-600 hover:underline" href={`/admin/redemption-codes?page=${page - 1}`}>Previous</Link>}
          <span>Page {page} / {totalPages}</span>
          {page < totalPages && <Link className="text-blue-600 hover:underline" href={`/admin/redemption-codes?page=${page + 1}`}>Next</Link>}
        </div>
      </div>
    </div>
  );
}

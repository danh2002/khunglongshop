import { DashboardSidebar } from "@/components";
import prisma from "@/utils/db";
import Link from "next/link";
import { revalidatePath } from "next/cache";

async function createCollectorSet(formData: FormData) {
  "use server";

  await prisma.collectorSet.create({
    data: {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || "") || null,
      totalSlots: Number(formData.get("totalSlots") || 0),
      rewardDescription: String(formData.get("rewardDescription") || "") || null,
      rewardCodeTemplate: String(formData.get("rewardCodeTemplate") || "") || null,
    },
  });

  revalidatePath("/admin/collector-sets");
}

async function deleteCollectorSet(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  const blockingOrderItems = await prisma.customer_order_product.count({
    where: {
      product: {
        setId: id,
      },
    },
  });

  if (blockingOrderItems > 0) {
    throw new Error("Cannot delete collector set with ordered products");
  }

  await prisma.product.updateMany({
    where: { setId: id },
    data: { setId: null, setSlotNumber: null },
  });
  await prisma.collectorSet.delete({ where: { id } });
  revalidatePath("/admin/collector-sets");
}

export default async function CollectorSetsAdminPage() {
  const sets = await prisma.collectorSet.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: {
        select: {
          products: true,
        },
      },
    },
  });

  return (
    <div className="bg-white flex justify-start max-w-screen-2xl mx-auto h-full max-xl:flex-col">
      <DashboardSidebar />
      <div className="flex flex-col gap-y-6 xl:ml-5 w-full max-xl:px-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">Collector Sets</h1>
          <details className="relative">
            <summary className="cursor-pointer uppercase bg-blue-500 px-6 py-3 text-white font-bold hover:bg-blue-600">
              TẠO MỚI
            </summary>
            <form action={createCollectorSet} className="absolute right-0 z-10 mt-3 grid w-[420px] gap-3 bg-white border shadow-lg p-5">
              <input name="name" required placeholder="Name" className="input input-bordered w-full" />
              <textarea name="description" placeholder="Description" className="textarea textarea-bordered w-full" />
              <input name="totalSlots" required min={1} type="number" placeholder="Total slots" className="input input-bordered w-full" />
              <input name="rewardDescription" placeholder="Reward description" className="input input-bordered w-full" />
              <input name="rewardCodeTemplate" placeholder="Reward code template" className="input input-bordered w-full" />
              <button className="uppercase bg-blue-500 px-6 py-3 text-white font-bold hover:bg-blue-600" type="submit">
                Save
              </button>
            </form>
          </details>
        </div>

        <div className="overflow-x-auto bg-white shadow-md">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Name</th>
                <th>Total Slots</th>
                <th>Assigned Products</th>
                <th>Created At</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sets.map((set) => (
                <tr key={set.id}>
                  <td>
                    <Link href={`/admin/collector-sets/${set.id}`} className="text-blue-600 hover:underline font-semibold">
                      {set.name}
                    </Link>
                  </td>
                  <td>{set.totalSlots}</td>
                  <td>{set._count.products}</td>
                  <td>{set.createdAt.toLocaleDateString()}</td>
                  <td className="flex gap-2">
                    <Link href={`/admin/collector-sets/${set.id}`} className="text-blue-600 hover:underline">
                      SỬA
                    </Link>
                    <form action={deleteCollectorSet}>
                      <input type="hidden" name="id" value={set.id} />
                      <button className="text-red-600 hover:underline" type="submit">
                        XÓA
                      </button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

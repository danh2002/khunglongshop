import { DashboardSidebar } from "@/components";
import prisma from "@/utils/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function updateCollectorSet(formData: FormData) {
  "use server";

  const id = String(formData.get("id") || "");
  await prisma.collectorSet.update({
    where: { id },
    data: {
      name: String(formData.get("name") || ""),
      description: String(formData.get("description") || "") || null,
      totalSlots: Number(formData.get("totalSlots") || 0),
      rewardDescription: String(formData.get("rewardDescription") || "") || null,
      rewardCodeTemplate: String(formData.get("rewardCodeTemplate") || "") || null,
    },
  });

  revalidatePath(`/admin/collector-sets/${id}`);
}

async function saveSlots(formData: FormData) {
  "use server";

  const setId = String(formData.get("setId") || "");
  const totalSlots = Number(formData.get("totalSlots") || 0);

  await prisma.product.updateMany({
    where: { setId },
    data: { setId: null, setSlotNumber: null },
  });

  for (let slotNumber = 1; slotNumber <= totalSlots; slotNumber += 1) {
    const productId = String(formData.get(`slot-${slotNumber}`) || "");
    if (!productId) continue;

    await prisma.product.update({
      where: { id: productId },
      data: {
        setId,
        setSlotNumber: slotNumber,
        isCollector: true,
      },
    });
  }

  revalidatePath(`/admin/collector-sets/${setId}`);
}

export default async function CollectorSetDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const collectorSet = await prisma.collectorSet.findUnique({
    where: { id },
    include: { products: true },
  });

  if (!collectorSet) redirect("/admin/collector-sets");

  const products = await prisma.product.findMany({
    where: { isCollector: true },
    orderBy: { title: "asc" },
  });
  const assignedBySlot = new Map(
    collectorSet.products
      .filter((product) => product.setSlotNumber !== null)
      .map((product) => [product.setSlotNumber!, product.id])
  );

  return (
    <div className="bg-white flex justify-start max-w-screen-2xl mx-auto h-full max-xl:flex-col">
      <DashboardSidebar />
      <div className="flex flex-col gap-y-7 xl:ml-5 w-full max-xl:px-5">
        <h1 className="text-3xl font-semibold">Collector Set Details</h1>

        <form action={updateCollectorSet} className="grid max-w-2xl gap-4 bg-white shadow-md p-5">
          <input type="hidden" name="id" value={collectorSet.id} />
          <input name="name" defaultValue={collectorSet.name} required className="input input-bordered w-full" />
          <textarea name="description" defaultValue={collectorSet.description || ""} className="textarea textarea-bordered w-full" />
          <input name="totalSlots" defaultValue={collectorSet.totalSlots} min={1} type="number" required className="input input-bordered w-full" />
          <input name="rewardDescription" defaultValue={collectorSet.rewardDescription || ""} className="input input-bordered w-full" />
          <input name="rewardCodeTemplate" defaultValue={collectorSet.rewardCodeTemplate || ""} className="input input-bordered w-full" />
          <button className="uppercase bg-blue-500 px-6 py-3 text-white font-bold hover:bg-blue-600" type="submit">
            Update Set
          </button>
        </form>

        <form action={saveSlots} className="grid gap-4">
          <input type="hidden" name="setId" value={collectorSet.id} />
          <input type="hidden" name="totalSlots" value={collectorSet.totalSlots} />
          <div className="grid grid-cols-4 gap-4 max-xl:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
            {Array.from({ length: collectorSet.totalSlots }, (_, index) => {
              const slotNumber = index + 1;
              return (
                <label key={slotNumber} className="grid gap-2 border p-4 shadow-sm">
                  <span className="font-bold">Slot {slotNumber}</span>
                  <select name={`slot-${slotNumber}`} defaultValue={assignedBySlot.get(slotNumber) || ""} className="select select-bordered w-full">
                    <option value="">Unassigned</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.title}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>
          <button className="uppercase bg-blue-500 px-6 py-3 text-white font-bold hover:bg-blue-600" type="submit">
            Save Slots
          </button>
        </form>
      </div>
    </div>
  );
}

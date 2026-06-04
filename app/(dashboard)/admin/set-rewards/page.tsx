import { DashboardSidebar } from "@/components";
import prisma from "@/utils/db";

export default async function SetRewardsAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const isClaimed = typeof sp.isClaimed === "string" ? sp.isClaimed : "all";
  const setId = typeof sp.set === "string" ? sp.set : "";
  const sets = await prisma.collectorSet.findMany({ orderBy: { name: "asc" } });
  const where: any = {};

  if (isClaimed === "pending") where.isClaimed = false;
  if (isClaimed === "claimed") where.isClaimed = true;
  if (setId) where.setId = setId;

  const rewards = await prisma.setReward.findMany({
    where,
    orderBy: { grantedAt: "desc" },
    include: { set: true },
  });
  const users = await prisma.user.findMany({
    where: { id: { in: [...new Set(rewards.map((reward) => reward.userId))] } },
    select: { id: true, email: true },
  });
  const userById = new Map(users.map((user) => [user.id, user]));

  return (
    <div className="bg-white flex justify-start max-w-screen-2xl mx-auto h-full max-xl:flex-col">
      <DashboardSidebar />
      <div className="flex flex-col gap-y-6 xl:ml-5 w-full max-xl:px-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-semibold">Set Rewards</h1>
          <a href="/api/admin/set-rewards/export" className="bg-blue-500 text-white px-6 py-3 font-bold hover:bg-blue-600">
            Export CSV
          </a>
        </div>

        <form className="flex flex-wrap gap-3 items-end">
          <label className="grid gap-1">
            <span>Status</span>
            <select name="isClaimed" defaultValue={isClaimed} className="select select-bordered">
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="claimed">Claimed</option>
            </select>
          </label>
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
          <button className="bg-blue-500 text-white px-6 py-3 font-bold hover:bg-blue-600" type="submit">
            Filter
          </button>
        </form>

        <div className="overflow-x-auto bg-white shadow-md">
          <table className="table w-full">
            <thead>
              <tr>
                <th>Reward Code</th>
                <th>Set</th>
                <th>User</th>
                <th>Granted At</th>
                <th>Claimed</th>
                <th>Claimed At</th>
              </tr>
            </thead>
            <tbody>
              {rewards.map((reward) => (
                <tr key={reward.id}>
                  <td className="font-mono">{reward.rewardCode}</td>
                  <td>{reward.set.name}</td>
                  <td>{userById.get(reward.userId)?.email || reward.userId}</td>
                  <td>{reward.grantedAt.toLocaleDateString()}</td>
                  <td>{reward.isClaimed ? "Yes" : "No"}</td>
                  <td>{reward.claimedAt ? reward.claimedAt.toLocaleString() : "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

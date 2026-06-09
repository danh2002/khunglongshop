import {
  AdminActionLink,
  AdminEmptyState,
  AdminPage,
  AdminPageHeader,
  AdminStatusBadge,
  AdminTable,
  AdminTd,
  AdminTh,
} from "@/components/admin/AdminUi";
import prisma from "@/utils/db";

export default async function SetRewardsPage() {
  const rewards = await prisma.setReward.findMany({
    orderBy: { grantedAt: "desc" },
    include: { set: true, user: { select: { email: true } } },
  });
  return (
    <AdminPage>
      <AdminPageHeader
        title="Phần thưởng"
        description="Mỗi người dùng chỉ có một phần thưởng cho mỗi bộ sưu tập."
        action={<AdminActionLink href="/api/admin/set-rewards/export">Xuất CSV</AdminActionLink>}
      />
      {rewards.length ? (
        <AdminTable>
          <thead><tr><AdminTh>Mã thưởng</AdminTh><AdminTh>Người dùng</AdminTh><AdminTh>Bộ sưu tập</AdminTh><AdminTh>Tiến độ</AdminTh><AdminTh>Được cấp</AdminTh><AdminTh>Trạng thái</AdminTh></tr></thead>
          <tbody>
            {rewards.map((reward) => (
              <tr key={reward.id}>
                <AdminTd className="font-mono">{reward.rewardCode}</AdminTd>
                <AdminTd>{reward.user.email}</AdminTd>
                <AdminTd>{reward.set.name}</AdminTd>
                <AdminTd>{reward.set.totalSlots}/{reward.set.totalSlots}</AdminTd>
                <AdminTd>{reward.grantedAt.toLocaleString("vi-VN")}</AdminTd>
                <AdminTd><AdminStatusBadge tone={reward.isClaimed ? "success" : "warning"}>{reward.isClaimed ? "Đã nhận" : "Chờ nhận"}</AdminStatusBadge></AdminTd>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      ) : <AdminEmptyState>Chưa có phần thưởng nào.</AdminEmptyState>}
    </AdminPage>
  );
}

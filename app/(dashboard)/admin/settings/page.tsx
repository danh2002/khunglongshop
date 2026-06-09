import { AdminPage, AdminPageHeader } from "@/components/admin/AdminUi";
import SettingsForm from "@/components/admin/SettingsForm";
import prisma from "@/utils/db";

export default async function AdminSettingsPage() {
  const settings = await prisma.siteSettings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
    include: { updatedBy: { select: { email: true } } },
  });
  return (
    <AdminPage>
      <AdminPageHeader
        title="Cài đặt"
        description="Chỉ lưu cấu hình vận hành công khai; secrets tiếp tục nằm trong biến môi trường."
      />
      <SettingsForm
        initial={{
          siteName: settings.siteName,
          supportEmail: settings.supportEmail ?? "",
          supportPhone: settings.supportPhone ?? "",
          shippingNotice: settings.shippingNotice ?? "",
          maintenanceMode: settings.maintenanceMode,
          defaultLocale: settings.defaultLocale as "vi" | "en" | "zh",
        }}
        updatedAt={settings.updatedAt.toISOString()}
        updatedBy={settings.updatedBy?.email ?? null}
      />
    </AdminPage>
  );
}

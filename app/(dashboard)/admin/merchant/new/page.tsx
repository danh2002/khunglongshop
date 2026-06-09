import { AdminPage, AdminPageHeader } from "@/components/admin/AdminUi";
import MerchantForm from "@/components/admin/MerchantForm";

export default function NewMerchantPage() {
  return <AdminPage><AdminPageHeader title="Tạo merchant" /><MerchantForm /></AdminPage>;
}

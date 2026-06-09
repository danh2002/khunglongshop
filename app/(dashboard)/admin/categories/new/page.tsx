import { AdminPage, AdminPageHeader } from "@/components/admin/AdminUi";
import CategoryForm from "@/components/admin/CategoryForm";

export default function NewCategoryPage() {
  return (
    <AdminPage>
      <AdminPageHeader title="Tạo danh mục" />
      <CategoryForm />
    </AdminPage>
  );
}

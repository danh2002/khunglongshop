import AdminSidebarLink from "@/components/admin/AdminSidebarLink";
import type { SVGProps } from "react";

type IconName =
  | "dashboard"
  | "bag"
  | "table"
  | "image"
  | "category"
  | "user"
  | "store"
  | "trophy"
  | "ticket"
  | "gear";

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/admin", label: "Tổng quan", icon: "dashboard" },
  { href: "/admin/orders", label: "Đơn hàng", icon: "bag" },
  { href: "/admin/products", label: "Sản phẩm", icon: "table" },
  { href: "/admin/homepage-slider", label: "Slider trang chủ", icon: "image" },
  { href: "/admin/featured-products", label: "Sản phẩm nổi bật", icon: "trophy" },
  { href: "/admin/categories", label: "Danh mục", icon: "category" },
  { href: "/admin/users", label: "Người dùng", icon: "user" },
  { href: "/admin/merchant", label: "Merchant", icon: "store" },
  { href: "/admin/collector-sets", label: "Bộ sưu tập", icon: "trophy" },
  { href: "/admin/redemption-codes", label: "Mã mở khóa", icon: "ticket" },
  { href: "/admin/set-rewards", label: "Phần thưởng", icon: "trophy" },
  { href: "/admin/settings", label: "Cài đặt", icon: "gear" },
];

function SidebarIcon({ name, ...props }: SVGProps<SVGSVGElement> & { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2,
    viewBox: "0 0 24 24",
    "aria-hidden": true,
    ...props,
  };

  switch (name) {
    case "dashboard":
      return (
        <svg {...common}>
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v5h-7z" />
          <path d="M13 11h7v9h-7z" />
          <path d="M4 13h7v7H4z" />
        </svg>
      );
    case "bag":
      return (
        <svg {...common}>
          <path d="M6 8h12l1 12H5z" />
          <path d="M9 8a3 3 0 0 1 6 0" />
        </svg>
      );
    case "table":
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4z" />
          <path d="M4 10h16" />
          <path d="M9 5v14" />
          <path d="M15 5v14" />
        </svg>
      );
    case "image":
      return (
        <svg {...common}>
          <path d="M4 5h16v14H4z" />
          <path d="m7 16 4-4 3 3 2-2 3 3" />
          <path d="M8 9h.01" />
        </svg>
      );
    case "category":
      return (
        <svg {...common}>
          <path d="M4 4h7v7H4z" />
          <path d="M13 4h7v7h-7z" />
          <path d="M4 13h7v7H4z" />
          <path d="M13 13h7v7h-7z" />
        </svg>
      );
    case "user":
      return (
        <svg {...common}>
          <path d="M20 21a8 8 0 0 0-16 0" />
          <path d="M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
      );
    case "store":
      return (
        <svg {...common}>
          <path d="M4 10h16" />
          <path d="m5 10 1-6h12l1 6" />
          <path d="M6 10v10h12V10" />
          <path d="M9 20v-6h6v6" />
        </svg>
      );
    case "trophy":
      return (
        <svg {...common}>
          <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
          <path d="M8 6H5a3 3 0 0 0 3 4" />
          <path d="M16 6h3a3 3 0 0 1-3 4" />
          <path d="M12 13v4" />
          <path d="M8 21h8" />
          <path d="M10 17h4" />
        </svg>
      );
    case "ticket":
      return (
        <svg {...common}>
          <path d="M4 8a2 2 0 0 0 0 4v4h16v-4a2 2 0 0 0 0-4V4H4z" />
          <path d="M9 8h.01" />
          <path d="M15 12h.01" />
        </svg>
      );
    case "gear":
      return (
        <svg {...common}>
          <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" />
          <path d="M19.4 15a8 8 0 0 0 .1-6" />
          <path d="M4.5 9a8 8 0 0 0 .1 6" />
          <path d="M8 4.9a8 8 0 0 1 8 0" />
          <path d="M16 19.1a8 8 0 0 1-8 0" />
        </svg>
      );
  }
}

export default function DashboardSidebar() {
  return (
    <aside className="sticky top-0 z-20 h-screen w-[280px] shrink-0 overflow-y-auto border-r border-[#e85d00]/25 bg-[#070707] text-white max-lg:static max-lg:h-auto max-lg:w-full max-lg:border-b max-lg:border-r-0">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e85d00]">Khủng Long Shop</p>
        <h2 className="mt-1 text-xl font-black uppercase italic">CMS Admin</h2>
      </div>
      <nav className="flex flex-col gap-1 p-3 max-lg:flex-row max-lg:overflow-x-auto" aria-label="Điều hướng quản trị">
        {navItems.map((item) => (
          <AdminSidebarLink key={item.href} href={item.href} label={item.label}>
            <SidebarIcon name={item.icon} className="h-[1.125rem] w-[1.125rem] shrink-0" />
          </AdminSidebarLink>
        ))}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FaBagShopping, FaGear, FaRegUser, FaStore, FaTable, FaTicket, FaTrophy } from "react-icons/fa6";
import { MdCategory, MdDashboard, MdPhotoLibrary } from "react-icons/md";

const navItems = [
  { href: "/admin", label: "Tổng quan", icon: MdDashboard },
  { href: "/admin/orders", label: "Đơn hàng", icon: FaBagShopping },
  { href: "/admin/products", label: "Sản phẩm", icon: FaTable },
  { href: "/admin/homepage-slider", label: "Slider trang chủ", icon: MdPhotoLibrary },
  { href: "/admin/categories", label: "Danh mục", icon: MdCategory },
  { href: "/admin/users", label: "Người dùng", icon: FaRegUser },
  { href: "/admin/merchant", label: "Merchant", icon: FaStore },
  { href: "/admin/collector-sets", label: "Bộ sưu tập", icon: FaTrophy },
  { href: "/admin/redemption-codes", label: "Mã mở khóa", icon: FaTicket },
  { href: "/admin/set-rewards", label: "Phần thưởng", icon: FaTrophy },
  { href: "/admin/settings", label: "Cài đặt", icon: FaGear },
];

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

const DashboardSidebar = () => {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 z-20 h-screen w-[280px] shrink-0 overflow-y-auto border-r border-[#e85d00]/25 bg-[#070707] text-white max-lg:static max-lg:h-auto max-lg:w-full max-lg:border-b max-lg:border-r-0">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#e85d00]">Khủng Long Shop</p>
        <h2 className="mt-1 text-xl font-black uppercase italic">CMS Admin</h2>
      </div>
      <nav className="flex flex-col gap-1 p-3 max-lg:flex-row max-lg:overflow-x-auto" aria-label="Điều hướng quản trị">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 whitespace-nowrap border px-3 text-sm font-black uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e85d00] ${
                active
                  ? "border-[#e85d00] bg-[#e85d00] text-white"
                  : "border-transparent text-white/75 hover:border-[#e85d00]/40 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon className="text-lg" aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default DashboardSidebar;

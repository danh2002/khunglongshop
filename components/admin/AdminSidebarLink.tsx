"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function isActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function AdminSidebarLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex min-h-11 items-center gap-3 whitespace-nowrap border px-3 text-sm font-black uppercase transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e85d00] ${
        active
          ? "border-[#e85d00] bg-[#e85d00] text-white"
          : "border-transparent text-white/75 hover:border-[#e85d00]/40 hover:bg-white/5 hover:text-white"
      }`}
    >
      {children}
      <span>{label}</span>
    </Link>
  );
}

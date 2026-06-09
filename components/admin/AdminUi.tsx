import Link from "next/link";
import type { ReactNode } from "react";

export function AdminPage({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <main className={`min-h-screen px-5 py-6 lg:px-8 ${className}`}>{children}</main>;
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
      <div>
        <h1 className="text-2xl font-black uppercase text-white">{title}</h1>
        {description ? <p className="mt-1 text-sm text-white/55">{description}</p> : null}
      </div>
      {action}
    </header>
  );
}

export function AdminActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-10 items-center border border-[#e85d00] bg-[#e85d00] px-4 text-sm font-black uppercase text-white transition hover:bg-[#ff7418] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e85d00]"
    >
      {children}
    </Link>
  );
}

export function AdminMetric({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className="border border-white/10 bg-[#0f0f0f] p-4">
      <p className="text-xs font-bold uppercase text-white/50">{label}</p>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#e85d00]">{hint}</p> : null}
    </div>
  );
}

export function AdminTable({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-x-auto border border-white/10 bg-[#0f0f0f]">
      <table className="w-full min-w-[760px] border-collapse text-left text-sm">{children}</table>
    </div>
  );
}

export function AdminTh({ children = null }: { children?: ReactNode }) {
  return (
    <th className="border-b border-white/10 px-4 py-3 text-xs font-black uppercase text-white/50">
      {children}
    </th>
  );
}

export function AdminTd({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return <td className={`border-b border-white/5 px-4 py-3 text-white/80 ${className}`}>{children}</td>;
}

export function AdminStatusBadge({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "success" | "warning" | "danger" | "neutral";
}) {
  const colors = {
    success: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300",
    warning: "border-amber-500/40 bg-amber-500/10 text-amber-300",
    danger: "border-red-500/40 bg-red-500/10 text-red-300",
    neutral: "border-white/15 bg-white/5 text-white/65",
  };
  return (
    <span className={`inline-flex border px-2 py-1 text-xs font-bold uppercase ${colors[tone]}`}>
      {children}
    </span>
  );
}

export function AdminEmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="border border-dashed border-white/15 px-5 py-12 text-center text-sm text-white/50">
      {children}
    </div>
  );
}

export const adminInputClass =
  "min-h-10 border border-white/15 bg-[#0f0f0f] px-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-[#e85d00]";

export const adminSecondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center border border-white/15 bg-white/5 px-4 text-sm font-bold uppercase text-white transition hover:border-[#e85d00] hover:text-[#e85d00]";

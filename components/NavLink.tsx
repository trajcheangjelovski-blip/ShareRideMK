"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/Icon";

// Sidebar / mobile nav link that highlights the current section.
// `exact` keeps overview links from matching their sub-pages.
export function NavLink({
  href,
  icon,
  exact = false,
  compact = false,
  children,
}: {
  href: string;
  icon?: IconName;
  exact?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  if (compact) {
    return (
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
          active ? "bg-ink text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        }`}
      >
        {icon && <Icon name={icon} size={15} />}
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14.5px] font-semibold transition-all duration-200 ${
        active
          ? "bg-white text-ink shadow-soft ring-1 ring-slate-200/80"
          : "text-slate-600 hover:bg-white/70 hover:text-ink"
      }`}
    >
      {icon && (
        <Icon name={icon} size={18} className={active ? "text-brand" : "text-slate-400 transition group-hover:text-brand"} />
      )}
      {children}
    </Link>
  );
}

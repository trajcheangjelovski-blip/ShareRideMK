"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Sidebar / mobile nav link that highlights the current section.
// `exact` keeps overview links from matching their sub-pages.
export function NavLink({
  href,
  exact = false,
  compact = false,
  children,
}: {
  href: string;
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
        className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${
          active ? "bg-brand text-white" : "bg-slate-100 text-slate-600 hover:bg-brand/10"
        }`}
      >
        {children}
      </Link>
    );
  }
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-lg px-3 py-2 font-medium transition-all duration-200 hover:translate-x-0.5 ${
        active ? "bg-brand/10 text-brand-dark" : "text-slate-600 hover:bg-brand/10 hover:text-brand-dark"
      }`}
    >
      {children}
    </Link>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Sticky glass header for public pages (landing, find-ride).
export async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 px-4">
      <div className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-5 py-3 shadow-soft">
        <Link href="/" className="text-lg font-bold tracking-tight text-gradient">Macedonia Ride</Link>
        <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
          <Link href="/find-ride" className="transition-colors hover:text-brand-dark">Најди превоз</Link>
          <Link href="/offer-ride" className="transition-colors hover:text-brand-dark">Понуди превоз</Link>
          {!user && <Link href="/login" className="transition-colors hover:text-brand-dark">Најава</Link>}
        </nav>
        {user ? (
          <Link href="/dashboard/passenger" className="btn-primary !px-4 !py-2 text-sm">Мој профил</Link>
        ) : (
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-brand-dark sm:hidden">Најава</Link>
            <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">Регистрација</Link>
          </div>
        )}
      </div>
    </header>
  );
}

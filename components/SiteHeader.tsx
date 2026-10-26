import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "@/components/Logo";

// Sticky glass header for public pages (landing, find-ride).
export async function SiteHeader() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <header className="sticky top-0 z-30 px-3 sm:px-4">
      <div className="glass mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5 shadow-soft sm:px-5">
        <Logo collapse />
        <nav className="hidden items-center gap-1 text-sm font-semibold text-slate-600 md:flex">
          <Link href="/find-ride" className="rounded-lg px-3 py-2 transition hover:bg-brand/10 hover:text-brand-dark">Најди превоз</Link>
          <Link href="/offer-ride" className="rounded-lg px-3 py-2 transition hover:bg-brand/10 hover:text-brand-dark">Понуди превоз</Link>
          <Link href="/#kako" className="rounded-lg px-3 py-2 transition hover:bg-brand/10 hover:text-brand-dark">Како функционира</Link>
        </nav>
        {user ? (
          <Link href="/dashboard/passenger" className="btn-primary !px-4 !py-2 text-sm">Мој профил</Link>
        ) : (
          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link href="/login" className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100">Најава</Link>
            <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">Регистрација</Link>
          </div>
        )}
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200/70 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-slate-500">
            Меѓуградско заедничко патување низ Македонија — со проверени профили, оценки и следење во живо.
          </p>
        </div>
        <div>
          <p className="section-label">Патници</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/find-ride" className="hover:text-brand-dark">Најди превоз</Link></li>
            <li><Link href="/register" className="hover:text-brand-dark">Регистрација</Link></li>
            <li><Link href="/login" className="hover:text-brand-dark">Најава</Link></li>
          </ul>
        </div>
        <div>
          <p className="section-label">Возачи</p>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li><Link href="/offer-ride" className="hover:text-brand-dark">Понуди превоз</Link></li>
            <li><Link href="/#kako" className="hover:text-brand-dark">Како функционира</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-slate-100 py-5 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} Macedonia Ride · заедничко патување
      </div>
    </footer>
  );
}

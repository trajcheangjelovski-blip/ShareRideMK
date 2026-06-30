import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("first_name, is_driver, is_passenger, status, role")
    .eq("id", user.id)
    .single();

  // Админите си имаат свој панел.
  if (profile?.role === "admin") redirect("/admin");

  // Корисниците мора да бидат одобрени од админ пред да користат сè.
  if (profile && profile.status !== "active") {
    return <AccountGate status={profile.status} name={profile.first_name} />;
  }

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:block">
        <Link href="/" className="block text-lg font-bold text-brand">
          Macedonia Ride
        </Link>
        <p className="mt-1 text-xs text-slate-500">
          Здраво, {profile?.first_name ?? "корисник"}
        </p>

        <nav className="mt-6 flex flex-col gap-1 text-sm">
          <SectionLabel>Патник</SectionLabel>
          <NavLink href="/dashboard/passenger">Преглед</NavLink>
          <NavLink href="/dashboard/passenger/find">Најди превоз</NavLink>
          <NavLink href="/dashboard/passenger/trips">Мои патувања</NavLink>
          <NavLink href="/dashboard/passenger/profile">Мој профил</NavLink>

          {profile?.is_driver && (
            <>
              <SectionLabel>Возач</SectionLabel>
              <NavLink href="/dashboard/driver">Преглед</NavLink>
              <NavLink href="/dashboard/driver/create-trip">Креирај патување</NavLink>
              <NavLink href="/dashboard/driver/requests">Барања</NavLink>
              <NavLink href="/dashboard/driver/vehicles">Возила</NavLink>
            </>
          )}
        </nav>

        <form action="/auth/signout" method="post" className="mt-8">
          <button className="text-xs text-slate-500 hover:text-red-600">
            Одјави се
          </button>
        </form>
      </aside>

      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="rounded-lg px-3 py-2 font-medium text-slate-600 transition-all duration-200 hover:translate-x-0.5 hover:bg-brand/10 hover:text-brand-dark">
      {children}
    </Link>
  );
}
function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 px-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{children}</p>;
}

function AccountGate({ status, name }: { status: string; name?: string }) {
  const blocked = status === "blocked" || status === "deleted";
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="blob -left-20 top-0 h-96 w-96 animate-blob bg-brand-light/40" />
        <div className="blob -right-16 bottom-0 h-80 w-80 animate-blob bg-amber-200/40" style={{ animationDelay: "4s" }} />
        <div className="absolute inset-0 bg-hero-radial" />
      </div>

      <div className="reveal glass w-full max-w-md rounded-3xl p-8 text-center shadow-lift">
        <div className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl text-white shadow-lift ${blocked ? "bg-red-500" : "bg-promo"}`}>
          {blocked ? (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
          ) : (
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
          )}
        </div>

        <h1 className="text-xl font-semibold">
          {blocked ? "Профилот е одбиен" : "Профилот чека одобрување"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          {blocked
            ? "Твојот профил не е одобрен или е блокиран. Ако мислиш дека е грешка, контактирај нè."
            : `Здраво${name ? `, ${name}` : ""}! Твоите податоци се прегледуваат рачно заради безбедност. Ќе можеш да ја користиш платформата штом администратор ќе го одобри профилот.`}
        </p>

        <form action="/auth/signout" method="post" className="mt-6">
          <button className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50">
            Одјави се
          </button>
        </form>
      </div>
    </main>
  );
}

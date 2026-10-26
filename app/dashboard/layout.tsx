import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/NavLink";
import { NotificationBell } from "@/components/realtime/NotificationBell";

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

  // Целосен gate: чека одобрување или е блокиран/избришан (немаат пристап).
  const status = profile?.status;
  if (status === "pending" || status === "blocked" || status === "deleted") {
    return <AccountGate status={status} name={profile?.first_name} />;
  }
  // needs_verification → пристапот е дозволен, но акциите се ограничени (банер долу).
  const needsVerification = status === "needs_verification";

  const passengerLinks = [
    { href: "/dashboard/passenger", label: "Преглед", exact: true },
    { href: "/dashboard/passenger/find", label: "Најди превоз" },
    { href: "/dashboard/passenger/trips", label: "Мои патувања" },
    { href: "/dashboard/passenger/profile", label: "Мој профил" },
  ];
  const driverLinks = profile?.is_driver
    ? [
        { href: "/dashboard/driver", label: "Преглед", exact: true },
        { href: "/dashboard/driver/trips", label: "Мои објави" },
        { href: "/dashboard/driver/create-trip", label: "Креирај патување" },
        { href: "/dashboard/driver/requests", label: "Барања" },
        { href: "/dashboard/driver/vehicles", label: "Возила" },
      ]
    : [];

  return (
    <div className="flex min-h-screen flex-col sm:flex-row">
      {/* Mobile: top bar + scrollable link row */}
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-bold text-brand">Macedonia Ride</Link>
          <div className="flex items-center gap-2">
            <NotificationBell userId={user.id} align="right" />
            <form action="/auth/signout" method="post">
              <button className="text-xs text-slate-500 hover:text-red-600">Одјави се</button>
            </form>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
          {passengerLinks.map((l) => (
            <NavLink key={l.href} href={l.href} exact={l.exact} compact>{l.label}</NavLink>
          ))}
          {driverLinks.map((l) => (
            <NavLink key={l.href} href={l.href} exact={l.exact} compact>
              {l.exact ? "Возач" : l.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <aside className="hidden w-60 shrink-0 border-r border-slate-200/70 bg-gradient-to-b from-slate-50 to-white p-4 sm:block">
        <div className="flex items-center justify-between">
          <Link href="/" className="block text-lg font-bold text-brand">
            Macedonia Ride
          </Link>
          <NotificationBell userId={user.id} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Здраво, {profile?.first_name ?? "корисник"}
        </p>

        <nav className="mt-6 flex flex-col gap-1 text-sm">
          <SectionLabel>Патник</SectionLabel>
          {passengerLinks.map((l) => (
            <NavLink key={l.href} href={l.href} exact={l.exact}>{l.label}</NavLink>
          ))}

          {driverLinks.length > 0 && (
            <>
              <SectionLabel>Возач</SectionLabel>
              {driverLinks.map((l) => (
                <NavLink key={l.href} href={l.href} exact={l.exact}>{l.label}</NavLink>
              ))}
            </>
          )}
        </nav>

        <form action="/auth/signout" method="post" className="mt-8">
          <button className="text-xs text-slate-500 hover:text-red-600">
            Одјави се
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 p-4 sm:p-6">
        {needsVerification && <VerifyBanner />}
        {children}
      </main>
    </div>
  );
}

function VerifyBanner() {
  return (
    <div className="reveal mb-6 flex flex-col gap-3 rounded-2xl border border-promo/40 bg-promo/10 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-semibold text-amber-800">Профилот е под дополнителна верификација</p>
        <p className="text-sm text-amber-700">
          Не можеш да поднесуваш барања ниту да објавуваш патувања додека повторно
          не ја потврдиш сликата. Качи нова портретна слика за преглед од админ.
        </p>
      </div>
      <Link href="/dashboard/verify" className="shrink-0 rounded-xl bg-promo px-5 py-2.5 text-center text-sm font-medium text-white transition hover:brightness-95">
        Верификувај се
      </Link>
    </div>
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

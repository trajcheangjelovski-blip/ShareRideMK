import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NavLink } from "@/components/NavLink";
import { NotificationBell } from "@/components/realtime/NotificationBell";
import { Logo } from "@/components/Logo";
import { Avatar } from "@/components/Avatar";
import { Icon, type IconName } from "@/components/Icon";

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
    .select("first_name, last_name, profile_image, is_driver, is_passenger, status, role")
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

  const passengerLinks: NavItem[] = [
    { href: "/dashboard/passenger", label: "Преглед", icon: "grid", exact: true },
    { href: "/dashboard/passenger/find", label: "Најди превоз", icon: "search" },
    { href: "/dashboard/passenger/trips", label: "Мои патувања", icon: "ticket" },
    { href: "/dashboard/passenger/profile", label: "Мој профил", icon: "user" },
  ];
  const driverLinks: NavItem[] = profile?.is_driver
    ? [
        { href: "/dashboard/driver", label: "Преглед", icon: "grid", exact: true },
        { href: "/dashboard/driver/trips", label: "Мои објави", icon: "route" },
        { href: "/dashboard/driver/create-trip", label: "Креирај патување", icon: "plus" },
        { href: "/dashboard/driver/requests", label: "Барања", icon: "inbox" },
        { href: "/dashboard/driver/vehicles", label: "Возила", icon: "car" },
      ]
    : [];
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || "Корисник";

  return (
    <div className="flex min-h-screen flex-col bg-canvas sm:flex-row">
      {/* Mobile: top bar + scrollable link row */}
      <div className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur sm:hidden">
        <div className="flex items-center justify-between px-4 py-2.5">
          <Logo />
          <div className="flex items-center gap-1">
            <NotificationBell userId={user.id} align="right" />
            <Link href="/dashboard/passenger/profile" aria-label="Мој профил" className="ml-1 rounded-full ring-2 ring-white">
              <Avatar src={profile?.profile_image} size={32} />
            </Link>
          </div>
        </div>
        <nav className="flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none]">
          {passengerLinks.map((l) => (
            <NavLink key={l.href} href={l.href} icon={l.icon} exact={l.exact} compact>{l.label}</NavLink>
          ))}
          {driverLinks.map((l) => (
            <NavLink key={l.href} href={l.href} icon={l.icon} exact={l.exact} compact>
              {l.exact ? "Возач" : l.label}
            </NavLink>
          ))}
          <form action="/auth/signout" method="post" className="shrink-0">
            <button className="flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold text-slate-500 ring-1 ring-slate-200 hover:text-red-600">
              <Icon name="logout" size={15} /> Одјави се
            </button>
          </form>
        </nav>
      </div>

      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-slate-200/70 bg-canvas p-4 sm:flex">
        <div className="flex items-center justify-between px-1">
          <Logo />
          <NotificationBell userId={user.id} />
        </div>

        <nav className="mt-8 flex flex-col gap-1 overflow-y-auto">
          <SectionLabel>Патник</SectionLabel>
          {passengerLinks.map((l) => (
            <NavLink key={l.href} href={l.href} icon={l.icon} exact={l.exact}>{l.label}</NavLink>
          ))}

          {driverLinks.length > 0 && (
            <>
              <SectionLabel>Возач</SectionLabel>
              {driverLinks.map((l) => (
                <NavLink key={l.href} href={l.href} icon={l.icon} exact={l.exact}>{l.label}</NavLink>
              ))}
            </>
          )}
        </nav>

        <div className="mt-auto flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-soft">
          <Avatar src={profile?.profile_image} size={38} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{name}</p>
            <p className="text-xs text-slate-500">{profile?.is_driver ? "Возач и патник" : "Патник"}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button title="Одјави се" aria-label="Одјави се" className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600">
              <Icon name="logout" size={18} />
            </button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 py-5 sm:px-8 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {needsVerification && <VerifyBanner />}
          {children}
        </div>
      </main>
    </div>
  );
}

type NavItem = { href: string; label: string; icon: IconName; exact?: boolean };

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
  return <p className="section-label mb-1 mt-5 px-3 first:mt-0">{children}</p>;
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

        <div className="mb-6 flex justify-center"><Logo /></div>
        <h1 className="text-xl font-extrabold tracking-tight text-ink">
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

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { SiteHeader, SiteFooter } from "@/components/SiteHeader";
import { SearchForm } from "@/components/SearchForm";
import { RouteNetwork } from "@/components/RouteNetwork";
import { Icon, type IconName } from "@/components/Icon";
import { todayISO } from "@/lib/format";

// Typed helper for the staggered-reveal CSS custom property.
const rv = (ms: string): React.CSSProperties => ({ "--d": ms } as React.CSSProperties);

export default async function HomePage() {
  const supabase = createClient();
  const today = todayISO();
  const [{ data: cities }, { data: upcoming }, { count: drivers }, { data: popular }] = await Promise.all([
    supabase.from("cities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("trips").select("start_city_id, end_city_id, price_per_seat")
      .eq("status", "published").gte("departure_date", today).gt("available_seats", 0).limit(500),
    supabase.from("driver_profiles").select("id", { count: "exact", head: true }),
    supabase.from("popular_routes")
      .select("start_city_id, end_city_id, start_city:start_city_id(name), end_city:end_city_id(name)")
      .eq("is_featured", true).order("sort_order").limit(8),
  ]);

  // Cheapest upcoming seat per route, for the popular-routes cards.
  const cheapest = new Map<string, number>();
  for (const t of upcoming ?? []) {
    const key = `${t.start_city_id}:${t.end_city_id}`;
    const p = Number(t.price_per_seat);
    if (!cheapest.has(key) || p < cheapest.get(key)!) cheapest.set(key, p);
  }
  const tripCount = upcoming?.length ?? 0;

  return (
    <main className="relative isolate overflow-x-clip bg-white">
      {/* soft backdrop */}
      <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[760px] bg-gradient-to-b from-[#ecf7f5] via-white to-white" />
      <div aria-hidden className="blob -left-32 -top-24 -z-10 h-[28rem] w-[28rem] animate-blob bg-brand-light/30" />

      <SiteHeader />

      {/* ---------- Hero ---------- */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pt-20">
        <div>
          <span className="reveal inline-flex items-center gap-2 rounded-full border border-brand/20 bg-white/70 px-3.5 py-1.5 text-xs font-semibold text-brand-dark shadow-soft" style={rv("0ms")}>
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            Carpool низ цела Македонија
          </span>
          <h1 className="reveal mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-6xl" style={rv("80ms")}>
            Патувај заедно.<br />
            <span className="text-gradient">Подели го патот.</span>
          </h1>
          <p className="reveal mt-5 max-w-xl text-lg leading-relaxed text-slate-600" style={rv("160ms")}>
            Возачите што веќе патуваат меѓу градовите објавуваат слободни места. Ти избираш каде да се качиш,
            возачот те прифаќа, а патот го следиш во живо.
          </p>

          <div className="reveal mt-8" style={rv("240ms")}>
            <SearchForm cities={cities ?? []} action="/find-ride" today={today} layout="hero" />
          </div>

          <ul className="reveal mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600" style={rv("320ms")}>
            {(cities?.length ?? 0) > 0 && <Fact icon="pin">{cities!.length} градови</Fact>}
            {tripCount > 0 && <Fact icon="car">{tripCount} претстојни патувања</Fact>}
            {(drivers ?? 0) > 0 && <Fact icon="users">{drivers} возачи</Fact>}
            <Fact icon="shield">Рачно одобрени профили</Fact>
          </ul>
        </div>

        <div className="reveal relative hidden lg:block" style={rv("200ms")}>
          <div className="card relative overflow-hidden bg-gradient-to-br from-white to-[#f1faf8] p-4 pb-14">
            <RouteNetwork className="h-auto w-full" id="hero" />
          </div>
          <div className="absolute -bottom-5 right-6 flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-lift">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-promo/15 text-amber-600"><Icon name="live" /></span>
            <div>
              <p className="text-sm font-bold text-ink">Следење во живо</p>
              <p className="text-xs text-slate-500">Знаеш кога пристигнува возилото</p>
            </div>
          </div>
          <div className="absolute -right-4 -top-4 flex items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold text-ink shadow-lift">
            <Icon name="star" size={15} className="fill-amber-400 text-amber-400" /> Оценки по секое патување
          </div>
        </div>
      </section>

      {/* ---------- Popular routes ---------- */}
      {(popular ?? []).length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-20">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="eyebrow">Популарни рути</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">Каде патуваат луѓето</h2>
            </div>
            <Link href="/find-ride" className="hidden items-center gap-1.5 text-sm font-semibold text-brand-dark hover:underline sm:inline-flex">
              Сите превози <Icon name="arrow" size={16} />
            </Link>
          </div>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(popular ?? []).map((r: any) => {
              const from = r.start_city?.name, to = r.end_city?.name;
              const price = cheapest.get(`${r.start_city_id}:${r.end_city_id}`);
              return (
                <Link
                  key={`${from}-${to}`}
                  href={`/find-ride?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
                  className="card-hover group flex items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-bold text-ink">
                      <span className="truncate">{from}</span>
                      <Icon name="arrow" size={15} className="shrink-0 text-brand" />
                      <span className="truncate">{to}</span>
                    </p>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {price != null ? <>од <b className="text-brand-dark">{price} ден</b></> : "Види превози"}
                    </p>
                  </div>
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 transition group-hover:bg-brand group-hover:text-white">
                    <Icon name="arrow" size={16} />
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* ---------- How it works ---------- */}
      <section id="kako" className="scroll-mt-24 bg-canvas py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="eyebrow">Како функционира</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">
            Три чекори од барање до пристигнување
          </h2>
          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <Steps
              title="За патници" icon="user"
              steps={[
                ["Пребарај", "Избери од каде, до каде и кога. Ги гледаш цената, слободните места и оценката на возачот."],
                ["Испрати барање", "Обележи на мапата каде да те земе возачот. Веднаш гледаш колку би скршнал од рутата."],
                ["Патувај", "Кога возачот ќе прифати, договорете се во разговорот и следи го возилото во живо."],
              ]}
            />
            <Steps
              title="За возачи" icon="car"
              steps={[
                ["Објави патување", "Додај возило, избери поаѓање и дестинација — рутата се пресметува автоматски."],
                ["Прифати патници", "Ти одлучуваш кој се качува. За секое барање го гледаш скршнувањето во минути."],
                ["Подели ги трошоците", "Започни го патувањето, патниците те следат, а на крајот се оценувате меѓусебно."],
              ]}
            />
          </div>
        </div>
      </section>

      {/* ---------- Trust & safety ---------- */}
      <section className="relative overflow-hidden bg-ink py-20 text-white">
        <div aria-hidden className="absolute -right-24 top-0 h-80 w-80 rounded-full bg-brand/25 blur-3xl" />
        <div className="relative mx-auto max-w-6xl px-4">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-brand-light">Безбедност</p>
          <h2 className="mt-2 max-w-2xl text-2xl font-extrabold tracking-tight sm:text-3xl">
            Знаеш со кого патуваш
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Trust icon="camera" title="Проверени профили">
              Секој профил има портретна слика и се одобрува рачно пред да може да патува.
            </Trust>
            <Trust icon="star" title="Оценки">
              По секое патување патникот и возачот се оценуваат — оценките се јавни.
            </Trust>
            <Trust icon="live" title="Следење во живо">
              За време на патувањето ја гледаш локацијата на возилото и проценетото време.
            </Trust>
            <Trust icon="chat" title="Разговор во апликацијата">
              Договорете се за местото на качување без да мора да го споделиш бројот.
            </Trust>
          </div>
        </div>
      </section>

      {/* ---------- Driver CTA ---------- */}
      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="relative grid items-center gap-8 overflow-hidden rounded-3xl bg-brand-gradient p-8 shadow-lift sm:p-12 lg:grid-cols-[1.2fr_1fr]">
          <div aria-hidden className="absolute -right-10 -top-10 h-56 w-56 animate-float rounded-full bg-white/10 blur-2xl" />
          <div className="relative">
            <h2 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">Имаш слободни места во колата?</h2>
            <p className="mt-3 max-w-xl text-white/85">
              Објави го патувањето за една минута, подели ги трошоците за гориво и патувај во друштво.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/offer-ride" className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-3 font-semibold text-brand-dark shadow-lift transition hover:-translate-y-0.5 hover:shadow-xl">
                Понуди превоз <Icon name="arrow" size={18} />
              </Link>
              <Link href="/register" className="inline-flex items-center rounded-xl border border-white/40 px-6 py-3 font-semibold text-white transition hover:bg-white/10">
                Креирај профил
              </Link>
            </div>
          </div>
          <ul className="relative space-y-3 text-sm text-white/90">
            {["Ти ја поставуваш цената и правилата", "Ти одобруваш секој патник", "Рутата и скршнувањето се пресметуваат автоматски"].map((t) => (
              <li key={t} className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-brand-dark"><Icon name="check" size={14} strokeWidth={3} /></span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Fact({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-1.5">
      <Icon name={icon} size={16} className="text-brand" />
      <span className="font-medium">{children}</span>
    </li>
  );
}

function Steps({ title, icon, steps }: { title: string; icon: IconName; steps: [string, string][] }) {
  return (
    <div className="card p-6 sm:p-8">
      <p className="flex items-center gap-2.5 text-lg font-bold text-ink">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand-dark"><Icon name={icon} size={18} /></span>
        {title}
      </p>
      <ol className="mt-6 space-y-6">
        {steps.map(([h, d], i) => (
          <li key={h} className="relative flex gap-4">
            {i < steps.length - 1 && <span aria-hidden className="absolute left-[15px] top-9 h-[calc(100%-12px)] w-px bg-slate-200" />}
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="font-semibold text-ink">{h}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">{d}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Trust({ icon, title, children }: { icon: IconName; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 transition hover:bg-white/[0.07]">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand/20 text-brand-light"><Icon name={icon} /></span>
      <p className="mt-4 font-bold">{title}</p>
      <p className="mt-1.5 text-sm leading-relaxed text-white/70">{children}</p>
    </div>
  );
}

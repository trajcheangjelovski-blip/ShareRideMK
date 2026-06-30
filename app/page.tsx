import Link from "next/link";

// Typed helper for the staggered-reveal CSS custom property.
const rv = (ms: string): React.CSSProperties => ({ "--d": ms } as React.CSSProperties);

export default function HomePage() {
  return (
    <main className="relative overflow-hidden">
      {/* Decorative animated background blobs */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="blob -left-24 -top-24 h-96 w-96 animate-blob bg-brand-light/50" />
        <div className="blob right-0 top-20 h-80 w-80 animate-blob bg-cyan-300/40" style={{ animationDelay: "3s" }} />
        <div className="blob bottom-0 left-1/3 h-72 w-72 animate-blob bg-teal-200/40" style={{ animationDelay: "6s" }} />
        <div className="absolute inset-0 bg-hero-radial" />
      </div>

      {/* Sticky glass header */}
      <header className="sticky top-0 z-30">
        <div className="glass mx-auto mt-4 flex max-w-6xl items-center justify-between rounded-2xl px-5 py-3 shadow-soft">
          <span className="text-lg font-bold tracking-tight text-gradient">Macedonia Ride</span>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 sm:flex">
            <Link href="/find-ride" className="transition-colors hover:text-brand-dark">Најди превоз</Link>
            <Link href="/offer-ride" className="transition-colors hover:text-brand-dark">Понуди превоз</Link>
            <Link href="/login" className="transition-colors hover:text-brand-dark">Најава</Link>
          </nav>
          <Link href="/register" className="btn-primary !px-4 !py-2 text-sm">
            Регистрација
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center sm:pt-28">
        <div className="reveal" style={rv("0ms")}>
          <span className="inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand-dark">
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
            Прва carpool платформа за Македонија
          </span>
        </div>

        <h1 className="reveal mt-6 text-5xl font-extrabold leading-tight tracking-tight sm:text-6xl" style={rv("80ms")}>
          Патувај заедно низ <span className="text-gradient">Македонија</span>
        </h1>

        <p className="reveal mx-auto mt-5 max-w-2xl text-lg text-slate-600" style={rv("160ms")}>
          Возачите што веќе патуваат објавуваат слободни места. Ти резервираш,
          се договарате и патувате заедно — побезбедно, поевтино, попаметно.
        </p>

        {/* Glassmorphic quick search */}
        <form
          action="/find-ride"
          className="reveal glass mx-auto mt-10 flex max-w-2xl flex-col gap-3 rounded-2xl p-4 shadow-lift sm:flex-row sm:items-center"
          style={rv("240ms")}
        >
          <input name="from" placeholder="Од (пр. Скопје)"
            className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30" />
          <input name="to" placeholder="До (пр. Велес)"
            className="flex-1 rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30" />
          <input name="date" type="date"
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30" />
          <button className="btn-primary">Барај</button>
        </form>

        <div className="reveal mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-sm text-slate-500" style={rv("320ms")}>
          <Stat value="22" label="градови" />
          <Stat value="40+" label="популарни рути" />
          <Stat value="★ 4.8" label="доверба" />
        </div>
      </section>

      {/* Feature cards */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="reveal card-hover group p-6 text-left"
              style={rv(`${400 + i * 120}ms`)}
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3">
                {f.icon}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* CTA banner */}
        <div className="reveal relative mt-16 overflow-hidden rounded-3xl bg-brand-gradient p-10 text-center shadow-lift" style={rv("760ms")}>
          <div aria-hidden className="absolute -right-10 -top-10 h-48 w-48 animate-float rounded-full bg-white/10 blur-2xl" />
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Имаш слободни места во колата?</h2>
          <p className="mx-auto mt-2 max-w-xl text-white/85">
            Објави го патувањето, подели ги трошоците и патувај со друштво.
          </p>
          <Link href="/register" className="mt-6 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-brand-dark shadow-lift transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl">
            Понуди превоз
          </Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        Macedonia Ride · заедничко патување
      </footer>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-base font-bold text-brand-dark">{value}</span>
      <span>{label}</span>
    </span>
  );
}

const features = [
  {
    title: "Јасна рута",
    desc: "Возачот ја дефинира точната рута и попатните застанувања — знаеш каде се качуваш и слегуваш.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
    ),
  },
  {
    title: "Ти одобруваш",
    desc: "Request-to-Join — никаква изненадувачка резервација. Возачот секогаш потврдува кој се качува.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
    ),
  },
  {
    title: "Live tracking",
    desc: "Следи го возилото во живо на мапа додека патуваш, со проценето време до дестинација.",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></svg>
    ),
  },
];

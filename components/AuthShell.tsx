import { Logo } from "@/components/Logo";
import { Icon, type IconName } from "@/components/Icon";
import { RouteNetwork } from "@/components/RouteNetwork";

// Split layout for login / register: brand panel on desktop, form on the right.
export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <aside className="relative hidden overflow-hidden bg-gradient-to-br from-[#e8f6f3] via-[#f3fbf9] to-white p-10 lg:flex lg:flex-col">
        <div aria-hidden className="blob -left-20 -top-20 h-80 w-80 animate-blob bg-brand-light/40" />
        <div className="relative"><Logo /></div>
        <div className="relative mt-auto">
          <h2 className="max-w-md text-3xl font-extrabold leading-tight tracking-tight text-ink">
            Секое патување почнува со <span className="text-gradient">доверба.</span>
          </h2>
          <ul className="mt-6 space-y-3">
            <Point icon="camera">Профили со слика, рачно одобрени</Point>
            <Point icon="star">Јавни оценки по секое патување</Point>
            <Point icon="live">Следење на возилото во живо</Point>
          </ul>
        </div>
        <div className="relative mt-10 rounded-2xl border border-white/80 bg-white/70 p-3 shadow-soft backdrop-blur">
          <RouteNetwork className="h-auto w-full" id="auth" />
        </div>
      </aside>

      <section className="flex items-center justify-center px-5 py-10 sm:px-10">
        <div className="reveal w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-[28px] font-extrabold tracking-tight text-ink">{title}</h1>
          {subtitle && <p className="mt-1.5 text-slate-600">{subtitle}</p>}
          <div className="mt-7">{children}</div>
          {footer && <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>}
        </div>
      </section>
    </main>
  );
}

function Point({ icon, children }: { icon: IconName; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 text-[15px] font-medium text-slate-700">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-brand-dark shadow-soft"><Icon name={icon} size={18} /></span>
      {children}
    </li>
  );
}

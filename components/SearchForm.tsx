import { Icon, type IconName } from "@/components/Icon";
import { SwapCities } from "@/components/SwapCities";

type City = { id: string; name: string };

// From / To / Date search. `hero` stacks into a card, `bar` is one row on desktop.
export function SearchForm({
  cities,
  action,
  today,
  defaults = {},
  layout = "bar",
}: {
  cities: City[];
  action?: string;
  today: string;
  defaults?: { from?: string; to?: string; date?: string };
  layout?: "hero" | "bar";
}) {
  const hero = layout === "hero";
  return (
    <form
      action={action}
      className={`card p-3 sm:p-4 ${hero ? "shadow-lift" : ""}`}
    >
      <div className={`grid gap-2.5 ${hero ? "sm:grid-cols-[1fr_auto_1fr]" : "lg:grid-cols-[1fr_auto_1fr_200px_auto] sm:grid-cols-[1fr_auto_1fr]"} items-end`}>
        <CitySelect name="from" label="Од" icon="pin" cities={cities} defaultValue={defaults.from} />
        <SwapCities className="mx-auto -my-1 flex h-9 w-9 items-center justify-center self-end rounded-full border border-slate-200 bg-white text-slate-500 shadow-soft transition hover:rotate-180 hover:border-brand hover:text-brand-dark sm:mb-1 sm:my-0" />
        <CitySelect name="to" label="До" icon="flag" cities={cities} defaultValue={defaults.to} />
        <div className={hero ? "sm:col-span-3" : "sm:col-span-3 lg:col-span-1"}>
          <label className="block">
            <span className="label">Датум</span>
            <span className="relative block">
              <Icon name="calendar" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input name="date" type="date" min={today} defaultValue={defaults.date} className="input pl-10" />
            </span>
          </label>
        </div>
        <button className={`btn-primary h-[46px] ${hero ? "sm:col-span-3" : "sm:col-span-3 lg:col-span-1"}`}>
          <Icon name="search" size={18} /> Барај превоз
        </button>
      </div>
    </form>
  );
}

function CitySelect({
  name, label, icon, cities, defaultValue,
}: {
  name: string; label: string; icon: IconName; cities: City[]; defaultValue?: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <span className="relative block">
        <Icon name={icon} size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand" />
        <select name={name} defaultValue={defaultValue ?? ""} className="input appearance-none truncate pl-10 pr-9">
          <option value="">Сите градови</option>
          {cities.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
        <Icon name="chevron" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      </span>
    </label>
  );
}

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, fullName, todayISO } from "@/lib/format";
import { Avatar } from "@/components/Avatar";

export type RideSearchParams = { from?: string; to?: string; date?: string };

// Search form + results. Used by the public /find-ride page and the
// passenger dashboard. Only upcoming, bookable trips are listed.
export async function RideSearch({ searchParams }: { searchParams: RideSearchParams }) {
  const supabase = createClient();
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const nameToId = new Map((cities ?? []).map((c) => [c.name, c.id]));
  const fromId = searchParams.from ? nameToId.get(searchParams.from) : undefined;
  const toId = searchParams.to ? nameToId.get(searchParams.to) : undefined;
  const today = todayISO();
  const date = searchParams.date && searchParams.date >= today ? searchParams.date : undefined;

  let q = supabase
    .from("trips")
    .select("id, driver_id, departure_date, departure_time, price_per_seat, available_seats, is_promoted, start_city:start_city_id(name), end_city:end_city_id(name)")
    .eq("status", "published")
    .gt("available_seats", 0);
  if (fromId) q = q.eq("start_city_id", fromId);
  if (toId) q = q.eq("end_city_id", toId);
  q = date ? q.eq("departure_date", date) : q.gte("departure_date", today);

  const { data } = await q
    .order("is_promoted", { ascending: false })
    .order("departure_date")
    .order("departure_time")
    .limit(50);
  const trips: any[] = data ?? [];

  // Driver names (public view) and ratings for the result cards.
  const driverIds = Array.from(new Set(trips.map((t) => t.driver_id)));
  const [{ data: profiles }, { data: ratings }] = driverIds.length
    ? await Promise.all([
        supabase.from("public_profiles").select("id, first_name, last_initial, profile_image").in("id", driverIds),
        supabase.from("driver_profiles").select("user_id, rating_average, total_trips").in("user_id", driverIds),
      ])
    : [{ data: [] }, { data: [] }];
  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]));
  const ratingById = new Map((ratings ?? []).map((r: any) => [r.user_id, r]));

  const filtered = Boolean(fromId || toId || date);
  const selectCls = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <div>
      <form className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft sm:flex-row sm:items-end">
        <Field label="Од">
          <select name="from" defaultValue={searchParams.from ?? ""} className={selectCls}>
            <option value="">Сите градови</option>
            {cities?.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="До">
          <select name="to" defaultValue={searchParams.to ?? ""} className={selectCls}>
            <option value="">Сите градови</option>
            {cities?.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Датум">
          <input name="date" type="date" min={today} defaultValue={date} className={selectCls} />
        </Field>
        <button className="btn-primary !py-2.5">Барај</button>
      </form>

      <p className="mt-6 text-sm font-medium text-slate-500">
        {filtered ? `Пронајдени патувања: ${trips.length}` : "Следни патувања"}
      </p>

      <div className="mt-3 space-y-3">
        {trips.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Нема слободни патувања {filtered ? "за оваа рута и датум" : "во моментов"}. Обиди се со друг датум
            или провери подоцна.
          </div>
        )}
        {trips.map((t, i) => {
          const driver = profileById.get(t.driver_id);
          const rating = ratingById.get(t.driver_id);
          return (
            <Link
              key={t.id}
              href={`/dashboard/passenger/trips/${t.id}`}
              style={{ "--d": `${i * 50}ms` } as React.CSSProperties}
              className={`reveal card-hover group block p-4 ${t.is_promoted ? "!border-promo/40 bg-promo/5 hover:!shadow-glow-promo" : ""}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-semibold">
                    {t.start_city?.name} → {t.end_city?.name}
                  </p>
                  <p className="text-sm text-slate-500">
                    {formatDate(t.departure_date)} · {formatTime(t.departure_time)}
                  </p>
                  <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                    <Avatar src={driver?.profile_image} />
                    <span className="truncate">{fullName(driver)}</span>
                    {rating && Number(rating.rating_average) > 0 && (
                      <span className="text-amber-600">★ {Number(rating.rating_average).toFixed(1)}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  {t.is_promoted && (
                    <span className="mb-1 inline-block rounded-full bg-promo px-2 py-0.5 text-[10px] font-semibold text-white">
                      Промовирано
                    </span>
                  )}
                  <p className="text-lg font-bold text-brand-dark transition-transform duration-300 group-hover:scale-105">
                    {Number(t.price_per_seat)} ден
                  </p>
                  <p className="text-xs text-slate-500">
                    {t.available_seats} {t.available_seats === 1 ? "слободно место" : "слободни места"}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex-1 text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

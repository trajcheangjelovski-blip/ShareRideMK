import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime, fullName, todayISO } from "@/lib/format";
import { Avatar } from "@/components/Avatar";
import { Icon } from "@/components/Icon";
import { SearchForm } from "@/components/SearchForm";

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
    .select("id, driver_id, departure_date, departure_time, price_per_seat, available_seats, is_promoted, luggage_allowed, start_city:start_city_id(name), end_city:end_city_id(name), vehicle:vehicle_id(has_ac)")
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
  const heading = fromId || toId
    ? `${searchParams.from ?? "Сите градови"} → ${searchParams.to ?? "сите градови"}`
    : "Следни патувања";

  return (
    <div>
      <SearchForm cities={cities ?? []} today={today} defaults={{ from: searchParams.from, to: searchParams.to, date }} />

      <div className="mt-8 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{heading}</h2>
        <p className="text-sm text-slate-500">
          {trips.length} {trips.length === 1 ? "патување" : "патувања"}{date ? ` · ${formatDate(date)}` : ""}
        </p>
      </div>

      <div className="mt-3 space-y-3">
        {trips.length === 0 && (
          <div className="card flex flex-col items-center px-6 py-12 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400"><Icon name="car" size={24} /></span>
            <p className="mt-4 font-semibold text-ink">Нема слободни патувања {filtered ? "за ова пребарување" : "во моментов"}</p>
            <p className="mt-1 max-w-sm text-sm text-slate-500">
              Обиди се со друг датум или без краен град — возачите често објавуваат патувања еден до два дена однапред.
            </p>
          </div>
        )}
        {trips.map((t, i) => {
          const driver = profileById.get(t.driver_id);
          const rating = ratingById.get(t.driver_id);
          const avg = Number(rating?.rating_average ?? 0);
          return (
            <Link
              key={t.id}
              href={`/dashboard/passenger/trips/${t.id}`}
              style={{ "--d": `${i * 50}ms` } as React.CSSProperties}
              className={`reveal card-hover group block overflow-hidden ${t.is_promoted ? "!border-promo/50 ring-1 ring-promo/20" : ""}`}
            >
              <div className="flex gap-4 p-4 sm:p-5">
                {/* time + date */}
                <div className="w-16 shrink-0">
                  <p className="text-xl font-extrabold tracking-tight text-ink">{formatTime(t.departure_time)}</p>
                  <p className="mt-0.5 text-xs font-medium text-slate-500">{formatDate(t.departure_date)}</p>
                </div>
                {/* route line */}
                <div className="flex min-w-0 flex-1 gap-3">
                  <div className="flex flex-col items-center pt-1.5" aria-hidden>
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-brand bg-white" />
                    <span className="my-1 w-0.5 flex-1 rounded bg-gradient-to-b from-brand to-cyan-700" />
                    <span className="h-2.5 w-2.5 rounded-full bg-cyan-800" />
                  </div>
                  <div className="flex min-w-0 flex-col justify-between gap-3">
                    <p className="truncate font-semibold text-ink">{t.start_city?.name}</p>
                    <p className="truncate font-semibold text-ink">{t.end_city?.name}</p>
                  </div>
                </div>
                {/* price */}
                <div className="shrink-0 text-right">
                  <p className="text-xl font-extrabold text-brand-dark">{Number(t.price_per_seat)}<span className="ml-1 text-sm font-bold">ден</span></p>
                  <p className="mt-0.5 flex items-center justify-end gap-1 text-xs text-slate-500">
                    <Icon name="seat" size={13} /> {t.available_seats} {t.available_seats === 1 ? "место" : "места"}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-4 py-2.5 sm:px-5">
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <Avatar src={driver?.profile_image} size={26} />
                  <span className="truncate font-medium text-slate-700">{fullName(driver)}</span>
                  {avg > 0 && (
                    <span className="flex items-center gap-0.5 text-xs font-semibold text-amber-600">
                      <Icon name="star" size={12} className="fill-amber-400 text-amber-400" /> {avg.toFixed(1)}
                    </span>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2 text-slate-400">
                  {t.is_promoted && <span className="rounded-full bg-promo px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Промовирано</span>}
                  {t.vehicle?.has_ac && <span className="hidden text-xs sm:inline">Клима</span>}
                  {t.luggage_allowed && <span className="hidden text-xs sm:inline">· Багаж</span>}
                  <Icon name="arrow" size={16} className="transition group-hover:translate-x-0.5 group-hover:text-brand" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

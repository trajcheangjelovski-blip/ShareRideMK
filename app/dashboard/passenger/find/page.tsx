import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type SP = { from?: string; to?: string; date?: string };

export default async function FindRidePage({ searchParams }: { searchParams: SP }) {
  const supabase = createClient();
  const { data: cities } = await supabase
    .from("cities")
    .select("id, name")
    .eq("is_active", true)
    .order("name");

  const nameToId = new Map((cities ?? []).map((c) => [c.name, c.id]));
  const fromId = searchParams.from ? nameToId.get(searchParams.from) : undefined;
  const toId = searchParams.to ? nameToId.get(searchParams.to) : undefined;

  let trips: any[] = [];
  if (fromId && toId) {
    let q = supabase
      .from("trips")
      .select(
        "id, departure_date, departure_time, price_per_seat, available_seats, is_promoted, " +
          "start_city:start_city_id(name), end_city:end_city_id(name)"
      )
      .eq("start_city_id", fromId)
      .eq("end_city_id", toId)
      .eq("status", "published")
      .gt("available_seats", 0);
    if (searchParams.date) q = q.eq("departure_date", searchParams.date);
    const { data } = await q.order("is_promoted", { ascending: false }).order("departure_time");
    trips = data ?? [];
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold">Најди превоз</h1>

      <form className="mt-6 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-end">
        <Field label="Од">
          <select name="from" defaultValue={searchParams.from} className="w-full rounded-lg border px-3 py-2">
            <option value="">—</option>
            {cities?.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="До">
          <select name="to" defaultValue={searchParams.to} className="w-full rounded-lg border px-3 py-2">
            <option value="">—</option>
            {cities?.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Датум">
          <input name="date" type="date" defaultValue={searchParams.date} className="w-full rounded-lg border px-3 py-2" />
        </Field>
        <button className="rounded-lg bg-brand px-5 py-2 font-medium text-white hover:bg-brand-dark">
          Барај
        </button>
      </form>

      <div className="mt-6 space-y-3">
        {fromId && toId && trips.length === 0 && (
          <p className="text-sm text-slate-500">Нема пронајдени патувања за оваа рута.</p>
        )}
        {trips.map((t, i) => (
          <Link
            key={t.id}
            href={`/dashboard/passenger/trips/${t.id}`}
            style={{ "--d": `${i * 70}ms` } as React.CSSProperties}
            className={`reveal card-hover group block p-4 ${t.is_promoted ? "!border-promo/40 bg-promo/5 hover:!shadow-glow-promo" : ""}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {t.start_city?.name} → {t.end_city?.name}
                </p>
                <p className="text-sm text-slate-500">
                  {t.departure_date} · {t.departure_time?.slice(0, 5)}
                </p>
              </div>
              <div className="text-right">
                {t.is_promoted && (
                  <span className="mb-1 inline-block rounded-full bg-promo px-2 py-0.5 text-[10px] font-semibold text-white">
                    Промовирано
                  </span>
                )}
                <p className="text-lg font-bold text-brand-dark transition-transform duration-300 group-hover:scale-105">{t.price_per_seat} ден</p>
                <p className="text-xs text-slate-500">{t.available_seats} слободни</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex-1 text-sm">
      <span className="mb-1 block text-slate-600">{label}</span>
      {children}
    </label>
  );
}

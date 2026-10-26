import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createTripSchema } from "@/lib/validations/schemas";
import { getDrivingRoute } from "@/lib/geo/routing";
import { toLineStringEWKT } from "@/lib/geo/polyline";
import { nowSkopje, todayISO } from "@/lib/format";
import { TripRouteFields } from "@/components/map/TripRouteFields";

const PATH = "/dashboard/driver/create-trip";
const fail = (msg: string): never => redirect(`${PATH}?error=${encodeURIComponent(msg)}`);

async function createTrip(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Само одобрени профили смеат да објавуваат патувања.
  const { data: me } = await supabase.from("users").select("status, is_driver").eq("id", user.id).single();
  if (!me?.is_driver) fail("Профилот не е регистриран како возач.");
  if (me?.status !== "active") {
    fail("Профилот е под дополнителна верификација — не можеш да објавуваш патувања додека не се верифицираш.");
  }

  const str = (k: string) => String(formData.get(k) ?? "").trim();
  const num = (k: string) => Number(formData.get(k));
  const parsed = createTripSchema.safeParse({
    vehicle_id: str("vehicle_id"),
    start_city_id: str("start_city_id"),
    end_city_id: str("end_city_id"),
    start_address: str("start_address") || undefined,
    start_latitude: num("start_latitude"),
    start_longitude: num("start_longitude"),
    destination_address: str("destination_address") || undefined,
    destination_latitude: num("destination_latitude"),
    destination_longitude: num("destination_longitude"),
    departure_date: str("departure_date"),
    departure_time: str("departure_time"),
    available_seats: num("available_seats"),
    price_per_seat: num("price_per_seat"),
    route_description: str("route_description") || undefined,
    max_detour_minutes: num("max_detour_minutes") || 10,
    smoking_allowed: formData.get("smoking_allowed") === "on",
    pets_allowed: formData.get("pets_allowed") === "on",
    luggage_allowed: formData.get("luggage_allowed") === "on",
    notes: str("notes") || undefined,
  });
  if (!parsed.success) fail("Провери ги внесените податоци — сите задолжителни полиња мора да се пополнети.");
  const t = parsed.data!;

  if (t.start_city_id === t.end_city_id) fail("Почетниот и крајниот град мора да се различни.");
  if (`${t.departure_date} ${t.departure_time.slice(0, 5)}` <= nowSkopje()) {
    fail("Датумот и времето на поаѓање мора да се во иднина.");
  }

  const { data: vehicle } = await supabase
    .from("vehicles").select("seats").eq("id", t.vehicle_id).eq("driver_id", user.id).maybeSingle();
  if (!vehicle) fail("Избери едно од твоите возила.");
  if (t.available_seats > vehicle!.seats) fail(`Возилото има најмногу ${vehicle!.seats} седишта.`);

  // Real road geometry (null → detour falls back to a straight line).
  const route = await getDrivingRoute([
    { lat: t.start_latitude, lng: t.start_longitude },
    { lat: t.destination_latitude, lng: t.destination_longitude },
  ]);

  const { waypoints: _waypoints, ...fields } = t;
  const { data: trip, error } = await supabase
    .from("trips")
    .insert({
      ...fields,
      driver_id: user.id,
      total_seats: t.available_seats,
      route_polyline: route?.polyline ?? null,
      route_geom: route ? toLineStringEWKT(route.points) : null,
      status: "published", // MVP: publish directly
    })
    .select("id")
    .single();
  if (error || !trip) {
    console.error("createTrip", error);
    fail("Патувањето не е зачувано. Обиди се повторно.");
  }
  redirect(`/dashboard/driver/trips/${trip!.id}?created=1`);
}

export default async function CreateTripPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const [{ data: me }, { data: cities }, { data: vehicles }] = await Promise.all([
    supabase.from("users").select("is_driver").eq("id", user!.id).single(),
    supabase.from("cities").select("id, name, latitude, longitude").eq("is_active", true).order("name"),
    supabase.from("vehicles").select("id, make, model, seats").eq("driver_id", user!.id).eq("is_active", true),
  ]);

  if (!me?.is_driver) {
    return (
      <div className="max-w-xl">
        <h1 className="page-title">Креирај патување</h1>
        <p className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
          Твојот профил е регистриран само како патник. За да нудиш превоз, контактирај го тимот за да се додаде улога возач.
        </p>
      </div>
    );
  }

  const noVehicles = (vehicles ?? []).length === 0;

  return (
    <div className="max-w-4xl">
      <h1 className="page-title">Креирај патување</h1>
      {searchParams.error && (
        <p className="mt-3 alert-error">{searchParams.error}</p>
      )}
      {noVehicles && (
        <p className="mt-3 alert-warn">
          Прво <Link href="/dashboard/driver/vehicles" className="font-medium underline">додај возило</Link>.
        </p>
      )}

      <form action={createTrip} className="mt-6 space-y-6">
        <Section title="Рута">
          <TripRouteFields cities={cities ?? []} />
        </Section>

        <Section title="Време и места">
          <Row>
            <Field label="Датум"><input name="departure_date" type="date" min={todayISO()} required className={inputCls} /></Field>
            <Field label="Време"><input name="departure_time" type="time" required className={inputCls} /></Field>
          </Row>
          <Row>
            <Field label="Слободни места"><input name="available_seats" type="number" min={1} max={8} defaultValue={3} required className={inputCls} /></Field>
            <Field label="Цена по место (ден)"><input name="price_per_seat" type="number" min={0} step={10} required className={inputCls} /></Field>
          </Row>
          <Row>
            <Field label="Возило">
              <select name="vehicle_id" required className={inputCls}>
                {vehicles?.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model} ({v.seats} седишта)</option>)}
              </select>
            </Field>
            <Field label="Макс. скршнување за патник (мин)">
              <input name="max_detour_minutes" type="number" min={0} max={120} defaultValue={10} required className={inputCls} />
            </Field>
          </Row>
        </Section>

        <Section title="Детали">
          <Field label="Опис на рута (опционално)">
            <textarea name="route_description" rows={2} className={inputCls}
              placeholder="Пр. Аеродром → автопат Е-75 → Катланово → Велес" />
          </Field>
          <Field label="Белешка за патниците (опционално)">
            <textarea name="notes" rows={2} className={inputCls} placeholder="Пр. Чекам најмногу 5 минути на местото за качување." />
          </Field>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" name="luggage_allowed" defaultChecked /> Багаж</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="smoking_allowed" /> Пушење</label>
            <label className="flex items-center gap-2"><input type="checkbox" name="pets_allowed" /> Миленици</label>
          </div>
        </Section>

        <button disabled={noVehicles} className="btn-primary disabled:cursor-not-allowed disabled:opacity-50">
          Објави патување
        </button>
      </form>
    </div>
  );
}

const inputCls = "input";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-soft sm:p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block flex-1 text-sm"><span className="mb-1 block text-slate-600">{label}</span>{children}</label>;
}

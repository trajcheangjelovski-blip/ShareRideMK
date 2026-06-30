import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function createTrip(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const seats = Number(formData.get("available_seats"));
  const { error } = await supabase.from("trips").insert({
    driver_id: user.id,
    vehicle_id: String(formData.get("vehicle_id")) || null,
    start_city_id: String(formData.get("start_city_id")),
    end_city_id: String(formData.get("end_city_id")),
    start_address: String(formData.get("start_address") ?? ""),
    start_latitude: Number(formData.get("start_latitude")),
    start_longitude: Number(formData.get("start_longitude")),
    destination_address: String(formData.get("destination_address") ?? ""),
    destination_latitude: Number(formData.get("destination_latitude")),
    destination_longitude: Number(formData.get("destination_longitude")),
    departure_date: String(formData.get("departure_date")),
    departure_time: String(formData.get("departure_time")),
    available_seats: seats,
    total_seats: seats,
    price_per_seat: Number(formData.get("price_per_seat")),
    route_description: String(formData.get("route_description") ?? ""),
    max_detour_minutes: Number(formData.get("max_detour_minutes") ?? 10),
    smoking_allowed: formData.get("smoking_allowed") === "on",
    pets_allowed: formData.get("pets_allowed") === "on",
    status: "published", // MVP: publish directly
  });
  if (error) redirect(`/dashboard/driver/create-trip?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard/driver?created=1");
}

export default async function CreateTripPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: cities } = await supabase.from("cities").select("id,name").order("name");
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("id, make, model")
    .eq("driver_id", user!.id)
    .eq("is_active", true);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Креирај патување</h1>
      {searchParams.error && (
        <p className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>
      )}
      {(vehicles ?? []).length === 0 && (
        <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Прво додај возило во „Возила“.
        </p>
      )}

      <form action={createTrip} className="mt-6 space-y-4">
        <Row>
          <Select name="start_city_id" label="Почетен град" options={cities ?? []} />
          <Select name="end_city_id" label="Краен град" options={cities ?? []} />
        </Row>
        <Row>
          <Text name="start_address" label="Почетна адреса" />
          <Text name="destination_address" label="Крајна адреса" />
        </Row>
        <Row>
          <Num name="start_latitude" label="Старт lat" />
          <Num name="start_longitude" label="Старт lng" />
        </Row>
        <Row>
          <Num name="destination_latitude" label="Дест. lat" />
          <Num name="destination_longitude" label="Дест. lng" />
        </Row>
        <Row>
          <Field label="Датум"><input name="departure_date" type="date" required className="w-full rounded-lg border px-3 py-2" /></Field>
          <Field label="Време"><input name="departure_time" type="time" required className="w-full rounded-lg border px-3 py-2" /></Field>
        </Row>
        <Row>
          <Num name="available_seats" label="Слободни места" />
          <Num name="price_per_seat" label="Цена по место (ден)" />
        </Row>
        <Row>
          <Num name="max_detour_minutes" label="Макс. скршнување (мин)" />
          <Field label="Возило">
            <select name="vehicle_id" className="w-full rounded-lg border px-3 py-2">
              {vehicles?.map((v) => <option key={v.id} value={v.id}>{v.make} {v.model}</option>)}
            </select>
          </Field>
        </Row>
        <Field label="Опис на рута">
          <textarea name="route_description" rows={3} className="w-full rounded-lg border px-3 py-2"
            placeholder="Пр. Аеродром → автопат Е-75 → Катланово → Велес" />
        </Field>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" name="smoking_allowed" /> Пушење</label>
          <label className="flex items-center gap-2"><input type="checkbox" name="pets_allowed" /> Миленици</label>
        </div>
        <button className="rounded-lg bg-brand px-6 py-2 font-medium text-white hover:bg-brand-dark">
          Објави патување
        </button>
      </form>
    </div>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-4 sm:flex-row">{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="flex-1 text-sm"><span className="mb-1 block text-slate-600">{label}</span>{children}</label>;
}
function Text({ name, label }: { name: string; label: string }) {
  return <Field label={label}><input name={name} className="w-full rounded-lg border px-3 py-2" /></Field>;
}
function Num({ name, label }: { name: string; label: string }) {
  return <Field label={label}><input name={name} type="number" step="any" required className="w-full rounded-lg border px-3 py-2" /></Field>;
}
function Select({ name, label, options }: { name: string; label: string; options: { id: string; name: string }[] }) {
  return (
    <Field label={label}>
      <select name={name} required className="w-full rounded-lg border px-3 py-2">
        {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
      </select>
    </Field>
  );
}

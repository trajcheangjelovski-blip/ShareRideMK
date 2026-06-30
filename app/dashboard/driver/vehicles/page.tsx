import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function addVehicle(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("vehicles").insert({
    driver_id: user.id,
    make: String(formData.get("make")),
    model: String(formData.get("model")),
    year: Number(formData.get("year")) || null,
    color: String(formData.get("color") ?? ""),
    license_plate: String(formData.get("license_plate")),
    seats: Number(formData.get("seats")),
    has_ac: formData.get("has_ac") === "on",
  });
  revalidatePath("/dashboard/driver/vehicles");
}

export default async function VehiclesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: vehicles } = await supabase
    .from("vehicles")
    .select("*")
    .eq("driver_id", user!.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Возила</h1>

      <form action={addVehicle} className="mt-6 grid grid-cols-2 gap-3 rounded-xl border p-4 text-sm">
        <input name="make" placeholder="Марка" required className="rounded-lg border px-3 py-2" />
        <input name="model" placeholder="Модел" required className="rounded-lg border px-3 py-2" />
        <input name="year" type="number" placeholder="Година" className="rounded-lg border px-3 py-2" />
        <input name="color" placeholder="Боја" className="rounded-lg border px-3 py-2" />
        <input name="license_plate" placeholder="Регистрација" required className="rounded-lg border px-3 py-2" />
        <input name="seats" type="number" min={1} max={8} placeholder="Седишта" required className="rounded-lg border px-3 py-2" />
        <label className="col-span-2 flex items-center gap-2"><input type="checkbox" name="has_ac" /> Има клима</label>
        <button className="col-span-2 rounded-lg bg-brand py-2 font-medium text-white hover:bg-brand-dark">
          Додај возило
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {(vehicles ?? []).map((v) => (
          <div key={v.id} className="rounded-xl border p-4 text-sm">
            <p className="font-medium">{v.make} {v.model} {v.year ? `(${v.year})` : ""}</p>
            <p className="text-slate-500">{v.color} · {v.seats} седишта · {v.license_plate} {v.has_ac ? "· клима" : ""}</p>
          </div>
        ))}
        {(vehicles ?? []).length === 0 && <p className="text-sm text-slate-500">Немаш додадено возило.</p>}
      </div>
    </div>
  );
}

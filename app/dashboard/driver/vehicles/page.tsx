import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vehicleSchema } from "@/lib/validations/schemas";

async function addVehicle(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;
  const parsed = vehicleSchema.safeParse({
    make: String(formData.get("make") ?? "").trim(),
    model: String(formData.get("model") ?? "").trim(),
    year: Number(formData.get("year")) || undefined,
    color: String(formData.get("color") ?? "").trim() || undefined,
    license_plate: String(formData.get("license_plate") ?? "").trim().toUpperCase(),
    seats: Number(formData.get("seats")),
    has_ac: formData.get("has_ac") === "on",
  });
  if (!parsed.success) {
    redirect(`/dashboard/driver/vehicles?error=${encodeURIComponent("Провери ги податоците: седишта 1–8, година 1980+, регистрацијата е задолжителна.")}`);
  }
  const { error } = await supabase.from("vehicles").insert({ driver_id: user.id, ...parsed.data });
  if (error) redirect(`/dashboard/driver/vehicles?error=${encodeURIComponent("Возилото не е зачувано.")}`);
  revalidatePath("/dashboard/driver/vehicles");
}

export default async function VehiclesPage({ searchParams }: { searchParams: { error?: string } }) {
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
      <h1 className="page-title">Возила</h1>
      {searchParams.error && (
        <p className="mt-3 alert-error">{searchParams.error}</p>
      )}

      <form action={addVehicle} className="mt-6 grid grid-cols-2 gap-3 card p-4 text-sm">
        <input name="make" placeholder="Марка" required className="input" />
        <input name="model" placeholder="Модел" required className="input" />
        <input name="year" type="number" placeholder="Година" className="input" />
        <input name="color" placeholder="Боја" className="input" />
        <input name="license_plate" placeholder="Регистрација" required className="input" />
        <input name="seats" type="number" min={1} max={8} placeholder="Седишта" required className="input" />
        <label className="col-span-2 flex items-center gap-2"><input type="checkbox" name="has_ac" /> Има клима</label>
        <button className="btn-primary col-span-2 !py-2.5">
          Додај возило
        </button>
      </form>

      <div className="mt-6 space-y-2">
        {(vehicles ?? []).map((v) => (
          <div key={v.id} className="card p-4 text-sm">
            <p className="font-medium">{v.make} {v.model} {v.year ? `(${v.year})` : ""}</p>
            <p className="text-slate-500">{v.color} · {v.seats} седишта · {v.license_plate} {v.has_ac ? "· клима" : ""}</p>
          </div>
        ))}
        {(vehicles ?? []).length === 0 && <p className="text-sm text-slate-500">Немаш додадено возило.</p>}
      </div>
    </div>
  );
}

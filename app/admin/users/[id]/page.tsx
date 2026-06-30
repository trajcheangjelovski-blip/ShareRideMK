import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function setUserStatus(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("users").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") return;

  const id = String(formData.get("user_id"));
  const status = String(formData.get("status"));
  const admin = createAdminClient();
  await admin.from("users").update({ status }).eq("id", id);
  revalidatePath(`/admin/users/${id}`);
  revalidatePath("/admin/users");
}

export default async function UserDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: u } = await supabase
    .from("users")
    .select("*, city:city_id(name)")
    .eq("id", params.id)
    .single();

  if (!u) {
    return (
      <div>
        <BackLink />
        <p className="mt-6 text-sm text-slate-500">Корисникот не е пронајден.</p>
      </div>
    );
  }

  // Дополнителни податоци (паралелно)
  const [driverProfile, vehicles, trips, bookings, reviews, reports] = await Promise.all([
    supabase.from("driver_profiles").select("bio, rating_average, total_trips, verification_status").eq("user_id", u.id).maybeSingle(),
    supabase.from("vehicles").select("*").eq("driver_id", u.id),
    supabase.from("trips").select("id, status, departure_date, start_city:start_city_id(name), end_city:end_city_id(name)").eq("driver_id", u.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("bookings").select("id, status, seats_requested, created_at, trips(start_city:start_city_id(name), end_city:end_city_id(name))").eq("passenger_id", u.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("reviews").select("rating, comment, review_type, created_at").eq("reviewed_user_id", u.id).order("created_at", { ascending: false }).limit(10),
    supabase.from("reports").select("id, reason, status, created_at").eq("reported_user_id", u.id).order("created_at", { ascending: false }),
  ]);

  const dp = driverProfile.data;

  return (
    <div className="max-w-3xl">
      <BackLink />

      {/* Header card */}
      <div className="reveal card-hover mt-4 flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-slate-100 ring-2 ring-brand/15">
          {u.profile_image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.profile_image} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">нема слика</div>
          )}
        </div>

        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold">{u.first_name} {u.last_name}</h1>
            <StatusChip status={u.status} />
          </div>
          <p className="mt-1 text-sm text-slate-500">{roleLabel(u)}</p>

          {/* Actions */}
          {u.role !== "admin" && (
            <div className="mt-4 flex flex-wrap gap-2">
              {u.status === "pending" && (
                <>
                  <Action id={u.id} status="active" label="Прифати профил" cls="bg-green-600 hover:bg-green-700 text-white" />
                  <Action id={u.id} status="needs_verification" label="Побарај верификација" cls="border text-amber-700 hover:bg-amber-50" />
                  <Action id={u.id} status="blocked" label="Одбиј / блокирај" cls="border text-red-600 hover:bg-red-50" />
                </>
              )}
              {u.status === "active" && (
                <>
                  <Action id={u.id} status="needs_verification" label="Побарај верификација" cls="border text-amber-700 hover:bg-amber-50" />
                  <Action id={u.id} status="blocked" label="Блокирај целосно" cls="border text-red-600 hover:bg-red-50" />
                </>
              )}
              {u.status === "needs_verification" && (
                <>
                  <Action id={u.id} status="active" label="Прифати профил" cls="bg-green-600 hover:bg-green-700 text-white" />
                  <Action id={u.id} status="blocked" label="Блокирај целосно" cls="border text-red-600 hover:bg-red-50" />
                </>
              )}
              {(u.status === "blocked" || u.status === "deleted") && (
                <Action id={u.id} status="active" label="Реактивирај" cls="border text-green-700 hover:bg-green-50" />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Лични податоци */}
      <Section title="Лични податоци">
        <Grid>
          <Info label="Име" value={u.first_name} />
          <Info label="Презиме" value={u.last_name} />
          <Info label="Email" value={u.email ?? "—"} />
          <Info label="Телефон" value={u.phone ?? "—"} />
          <Info label="Град" value={(u as any).city?.name ?? "—"} />
          <Info label="Улога" value={roleLabel(u)} />
          <Info label="Email потврден" value={u.email_verified ? "Да" : "Не"} />
          <Info label="Телефон потврден" value={u.phone_verified ? "Да" : "Не"} />
          <Info label="Регистриран" value={new Date(u.created_at).toLocaleString("mk-MK")} />
          <Info label="Статус" value={u.status} />
        </Grid>
      </Section>

      {/* Возач профил */}
      {u.is_driver && (
        <Section title="Возач">
          <Grid>
            <Info label="Оцена" value={`★ ${Number(dp?.rating_average ?? 0).toFixed(1)}`} />
            <Info label="Завршени патувања" value={dp?.total_trips ?? 0} />
            <Info label="Верификација" value={dp?.verification_status ?? "—"} />
          </Grid>
          {dp?.bio && <p className="mt-3 text-sm text-slate-600">{dp.bio}</p>}

          <h3 className="mt-5 text-sm font-semibold text-slate-700">Возила ({vehicles.data?.length ?? 0})</h3>
          <div className="mt-2 space-y-2">
            {(vehicles.data ?? []).length === 0 && <p className="text-sm text-slate-400">Нема додадено возило.</p>}
            {(vehicles.data ?? []).map((v: any) => (
              <div key={v.id} className="rounded-lg border p-3 text-sm">
                <p className="font-medium">{v.make} {v.model} {v.year ? `(${v.year})` : ""}</p>
                <p className="text-slate-500">{v.color} · {v.seats} седишта · {v.license_plate} {v.has_ac ? "· клима" : ""}</p>
              </div>
            ))}
          </div>

          <h3 className="mt-5 text-sm font-semibold text-slate-700">Креирани патувања ({trips.data?.length ?? 0})</h3>
          <List
            empty="Нема патувања."
            items={(trips.data ?? []).map((t: any) => (
              <ListRow key={t.id}
                left={`${t.start_city?.name} → ${t.end_city?.name}`}
                sub={t.departure_date}
                chip={t.status} />
            ))}
          />
        </Section>
      )}

      {/* Патник активност */}
      <Section title="Резервации како патник">
        <List
          empty="Нема резервации."
          items={(bookings.data ?? []).map((b: any) => (
            <ListRow key={b.id}
              left={`${b.trips?.start_city?.name ?? "?"} → ${b.trips?.end_city?.name ?? "?"}`}
              sub={`${b.seats_requested} место(а) · ${new Date(b.created_at).toLocaleDateString("mk-MK")}`}
              chip={b.status} />
          ))}
        />
      </Section>

      {/* Оценки */}
      <Section title={`Добиени оценки (${reviews.data?.length ?? 0})`}>
        <List
          empty="Сè уште нема оценки."
          items={(reviews.data ?? []).map((r: any, i: number) => (
            <ListRow key={i}
              left={`★ ${r.rating}`}
              sub={r.comment ?? "—"}
              chip={r.review_type === "passenger_to_driver" ? "како возач" : "како патник"} />
          ))}
        />
      </Section>

      {/* Пријави против корисникот */}
      {(reports.data ?? []).length > 0 && (
        <Section title={`Пријави против корисникот (${reports.data!.length})`}>
          <List
            empty=""
            items={reports.data!.map((r: any) => (
              <ListRow key={r.id} left={r.reason} sub={new Date(r.created_at).toLocaleDateString("mk-MK")} chip={r.status} danger />
            ))}
          />
        </Section>
      )}
    </div>
  );
}

/* ---------- helpers ---------- */

function roleLabel(u: any): string {
  if (u.role === "admin") return "Администратор";
  if (u.is_driver && u.is_passenger) return "Возач и патник";
  if (u.is_driver) return "Возач";
  return "Патник";
}

function BackLink() {
  return (
    <Link href="/admin/users" className="text-sm text-brand hover:underline">← Назад кон корисници</Link>
  );
}

function Action({ id, status, label, cls }: { id: string; status: string; label: string; cls: string }) {
  return (
    <form action={setUserStatus}>
      <input type="hidden" name="user_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`rounded-lg px-4 py-2 text-sm font-medium transition ${cls}`}>{label}</button>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="reveal card-hover mt-5 p-6">
      <h2 className="font-medium">{title}</h2>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</div>;
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="break-words font-medium">{value}</p>
    </div>
  );
}

function List({ items, empty }: { items: React.ReactNode[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return <div className="space-y-2">{items}</div>;
}

function ListRow({ left, sub, chip, danger }: { left: string; sub?: string; chip?: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-lg border p-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">{left}</p>
        {sub && <p className="truncate text-slate-500">{sub}</p>}
      </div>
      {chip && (
        <span className={`ml-2 shrink-0 rounded-full px-2.5 py-1 text-xs ${danger ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-600"}`}>
          {chip}
        </span>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    needs_verification: "bg-orange-100 text-orange-800",
    active: "bg-green-100 text-green-800",
    blocked: "bg-red-100 text-red-700",
    deleted: "bg-slate-200 text-slate-600",
  };
  const label: Record<string, string> = {
    pending: "на чекање", needs_verification: "доп. верификација",
    active: "одобрен", blocked: "блокиран", deleted: "избришан",
  };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? "bg-slate-100"}`}>{label[status] ?? status}</span>;
}

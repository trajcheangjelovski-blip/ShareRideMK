import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function resolveReport(formData: FormData) {
  "use server";
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("users").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") return;
  const admin = createAdminClient();
  await admin.from("reports")
    .update({ status: String(formData.get("status")), resolved_at: new Date().toISOString() })
    .eq("id", String(formData.get("report_id")));
  revalidatePath("/admin/reports");
}

export default async function AdminReportsPage() {
  const supabase = createClient();
  const { data: reports } = await supabase
    .from("reports")
    .select("id, reason, description, status, created_at, reporter:reporter_id(first_name,last_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Пријави</h1>
      <div className="mt-6 space-y-2">
        {(reports ?? []).length === 0 && <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">Нема пријави.</p>}
        {(reports ?? []).map((r: any) => (
          <div key={r.id} className="card-hover p-4 text-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium">{r.reason}</p>
                {r.description && <p className="mt-1 text-slate-600">{r.description}</p>}
                <p className="mt-1 text-xs text-slate-400">
                  Пријавил: {r.reporter?.first_name} {r.reporter?.last_name} · {new Date(r.created_at).toLocaleDateString("mk-MK")}
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs">{r.status}</span>
            </div>
            {r.status === "open" && (
              <div className="mt-3 flex gap-2">
                <form action={resolveReport}>
                  <input type="hidden" name="report_id" value={r.id} />
                  <input type="hidden" name="status" value="resolved" />
                  <button className="rounded-lg bg-green-600 px-3 py-1.5 text-xs text-white hover:bg-green-700">Реши</button>
                </form>
                <form action={resolveReport}>
                  <input type="hidden" name="report_id" value={r.id} />
                  <input type="hidden" name="status" value="dismissed" />
                  <button className="rounded-lg border px-3 py-1.5 text-xs hover:bg-slate-50">Отфрли</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

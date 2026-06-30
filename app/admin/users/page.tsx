import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";

async function setUserStatus(formData: FormData) {
  "use server";
  // Only admins reach this page (layout guard), but re-check on the server.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase.from("users").select("role").eq("id", user!.id).single();
  if (me?.role !== "admin") return;

  const id = String(formData.get("user_id"));
  const status = String(formData.get("status")); // active | blocked
  const admin = createAdminClient();
  await admin.from("users").update({ status }).eq("id", id);
  revalidatePath("/admin/users");
}

const TABS = [
  { key: "pending", label: "На чекање" },
  { key: "active", label: "Одобрени" },
  { key: "blocked", label: "Одбиени" },
  { key: "all", label: "Сите" },
];

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: { filter?: string };
}) {
  const filter = searchParams.filter ?? "pending";
  const supabase = createClient();
  let q = supabase
    .from("users")
    .select("id, first_name, last_name, email, phone, profile_image, role, status, is_driver, created_at")
    .order("created_at", { ascending: false });
  if (filter !== "all") q = q.eq("status", filter);
  const { data: users } = await q;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Корисници</h1>

      {/* Tabs */}
      <div className="mt-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <a
            key={t.key}
            href={`/admin/users?filter=${t.key}`}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === t.key
                ? "bg-brand text-white shadow-soft"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {(users ?? []).length === 0 && (
          <p className="rounded-xl border bg-white p-4 text-sm text-slate-500">Нема корисници во оваа категорија.</p>
        )}

        {(users ?? []).map((u: any, i: number) => (
          <div
            key={u.id}
            style={{ "--d": `${i * 60}ms` } as React.CSSProperties}
            className="reveal card-hover flex flex-col gap-4 p-4 sm:flex-row sm:items-center"
          >
            {/* Photo — главен фактор за веродостојност */}
            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-full bg-slate-100 ring-2 ring-brand/15">
              {u.profile_image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u.profile_image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">нема</div>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-medium">
                {u.first_name} {u.last_name}{" "}
                <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
                  {u.is_driver ? "возач/патник" : "патник"}
                </span>
              </p>
              <p className="text-sm text-slate-500">{u.email} · {u.phone ?? "без телефон"}</p>
              <p className="text-xs text-slate-400">
                Регистриран: {new Date(u.created_at).toLocaleString("mk-MK")}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <StatusChip status={u.status} />
              {u.status === "pending" && (
                <>
                  <Action id={u.id} status="active" label="Прифати" cls="bg-green-600 hover:bg-green-700 text-white" />
                  <Action id={u.id} status="blocked" label="Одбиј" cls="border hover:bg-slate-50" />
                </>
              )}
              {u.status === "active" && u.role !== "admin" && (
                <Action id={u.id} status="blocked" label="Блокирај" cls="border hover:bg-red-50 text-red-600" />
              )}
              {u.status === "blocked" && (
                <Action id={u.id} status="active" label="Реактивирај" cls="border hover:bg-green-50 text-green-700" />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Action({ id, status, label, cls }: { id: string; status: string; label: string; cls: string }) {
  return (
    <form action={setUserStatus}>
      <input type="hidden" name="user_id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${cls}`}>{label}</button>
    </form>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    pending: "bg-amber-100 text-amber-800",
    active: "bg-green-100 text-green-800",
    blocked: "bg-red-100 text-red-700",
    deleted: "bg-slate-200 text-slate-600",
  };
  const label: Record<string, string> = {
    pending: "на чекање",
    active: "одобрен",
    blocked: "одбиен",
    deleted: "избришан",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${map[status] ?? "bg-slate-100"}`}>
      {label[status] ?? status}
    </span>
  );
}

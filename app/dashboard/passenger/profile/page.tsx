import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadAvatar } from "@/lib/storage/avatar";

const PATH = "/dashboard/passenger/profile";

// --- Update name / phone / photo ---
async function updateProfile(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const photo = formData.get("photo") as File | null;

  if (!first_name || !last_name) redirect(`${PATH}?error=${encodeURIComponent("Име и презиме се задолжителни.")}`);
  if (!phone) redirect(`${PATH}?error=${encodeURIComponent("Телефонот е задолжителен.")}`);

  const patch: Record<string, unknown> = { first_name, last_name, phone };
  if (photo && photo.size > 0) {
    try {
      patch.profile_image = await uploadAvatar(user.id, photo);
    } catch (e: any) {
      redirect(`${PATH}?error=${encodeURIComponent(e?.message ?? "Грешка при качување.")}`);
    }
  }

  const admin = createAdminClient();
  await admin.from("users").update(patch).eq("id", user.id);
  revalidatePath(PATH);
  redirect(`${PATH}?ok=1`);
}

// --- Change password ---
async function changePassword(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const pass = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (pass.length < 8) redirect(`${PATH}?perror=${encodeURIComponent("Лозинката мора да има барем 8 знаци.")}`);
  if (pass !== confirm) redirect(`${PATH}?perror=${encodeURIComponent("Лозинките не се совпаѓаат.")}`);

  const { error } = await supabase.auth.updateUser({ password: pass });
  if (error) redirect(`${PATH}?perror=${encodeURIComponent(error.message)}`);
  redirect(`${PATH}?pok=1`);
}

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: { ok?: string; error?: string; pok?: string; perror?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("users")
    .select("first_name,last_name,email,phone,profile_image")
    .eq("id", user!.id)
    .single();

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-semibold">Мој профил</h1>

      {/* Лични податоци + слика */}
      <form action={updateProfile} className="reveal card-hover mt-6 p-6">
        <h2 className="font-medium">Лични податоци</h2>
        {searchParams.ok && <Msg ok>Зачувано успешно.</Msg>}
        {searchParams.error && <Msg>{searchParams.error}</Msg>}

        <div className="mt-4 flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 ring-2 ring-brand/20">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {me?.profile_image ? (
              <img src={me.profile_image} alt="Профил" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-slate-400">—</div>
            )}
          </div>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Промени слика</span>
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp"
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white hover:file:bg-brand-dark" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <input name="first_name" defaultValue={me?.first_name ?? ""} placeholder="Име" required className={inputCls} />
          <input name="last_name" defaultValue={me?.last_name ?? ""} placeholder="Презиме" required className={inputCls} />
          <input name="phone" defaultValue={me?.phone ?? ""} placeholder="Телефон" required className={`col-span-2 ${inputCls}`} />
          <input defaultValue={me?.email ?? ""} disabled className={`col-span-2 ${inputCls} bg-slate-50 text-slate-400`} />
        </div>
        <button className="btn-primary mt-4 !py-2.5">Зачувај</button>
      </form>

      {/* Смена на лозинка */}
      <form action={changePassword} className="reveal card-hover mt-6 p-6">
        <h2 className="font-medium">Смена на лозинка</h2>
        {searchParams.pok && <Msg ok>Лозинката е сменета.</Msg>}
        {searchParams.perror && <Msg>{searchParams.perror}</Msg>}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <input name="password" type="password" placeholder="Нова лозинка" required className={inputCls} />
          <input name="confirm" type="password" placeholder="Потврди лозинка" required className={inputCls} />
        </div>
        <button className="btn-primary mt-4 !py-2.5">Смени лозинка</button>
      </form>
    </div>
  );
}

function Msg({ children, ok }: { children: React.ReactNode; ok?: boolean }) {
  return (
    <p className={`mt-3 rounded-xl p-3 text-sm ${ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
      {children}
    </p>
  );
}

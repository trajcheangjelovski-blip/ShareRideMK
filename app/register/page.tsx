import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadAvatar } from "@/lib/storage/avatar";
import { AuthShell } from "@/components/AuthShell";
import { Icon, type IconName } from "@/components/Icon";

async function register(formData: FormData) {
  "use server";
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role")); // passenger | driver | both
  const photo = formData.get("photo") as File | null;

  // --- задолжителни полиња ---
  const fail = (msg: string) => redirect(`/register?error=${encodeURIComponent(msg)}`);
  if (!first_name || !last_name) fail("Името и презимето се задолжителни.");
  if (!phone) fail("Телефонскиот број е задолжителен.");
  if (!photo || photo.size === 0) fail("Портретната слика е задолжителна.");

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error || !data.user) {
    fail(error?.message ?? "Грешка при регистрација.");
  }
  const userId = data!.user!.id;

  // Качи ја портретната слика во storage.
  let profile_image: string;
  try {
    profile_image = await uploadAvatar(userId, photo!);
  } catch (e: any) {
    fail(e?.message ?? "Грешка при качување на сликата.");
    return;
  }

  // Mirror into public.users (id == auth user id). Service role bypasses RLS.
  const admin = createAdminClient();
  await admin.from("users").insert({
    id: userId,
    first_name,
    last_name,
    email,
    phone,
    profile_image,
    role: role === "driver" ? "driver" : "passenger",
    is_driver: role === "driver" || role === "both",
    is_passenger: role === "passenger" || role === "both",
    status: "pending", // секоја регистрација чека рачно одобрување од админ
  });
  if (role === "driver" || role === "both") {
    await admin.from("driver_profiles").insert({ user_id: userId });
  }

  // Корисникот е логиран, но dashboard-от го блокира додека не е одобрен.
  redirect("/dashboard/passenger");
}

export default function RegisterPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const inputCls = "input py-3";
  return (
    <AuthShell
      title="Креирај профил"
      subtitle="Една регистрација — и за патување и за нудење превоз."
      footer={<>Веќе имаш профил?{" "}<Link href="/login" className="font-semibold text-brand-dark hover:underline">Најави се</Link></>}
    >
        {searchParams.error && <p className="alert-error mb-4">{searchParams.error}</p>}
        <p className="mb-5 flex gap-2.5 rounded-xl border border-brand/15 bg-brand/5 p-3 text-xs leading-relaxed text-brand-dark">
          <Icon name="shield" size={18} className="shrink-0" />
          <span>
            Сите полиња се задолжителни. Секоја регистрација се прегледува рачно — профилот се активира откако админ ќе ги
            потврди податоците.
          </span>
        </p>
        <form action={register} className="flex flex-col gap-4">
          <div className="flex gap-3">
            <Field label="Име" className="w-1/2">
              <input name="first_name" placeholder="Име" required className={inputCls} />
            </Field>
            <Field label="Презиме" className="w-1/2">
              <input name="last_name" placeholder="Презиме" required className={inputCls} />
            </Field>
          </div>
          <Field label="Email">
            <input name="email" type="email" autoComplete="email" placeholder="ime@primer.mk" required className={inputCls} />
          </Field>
          <Field label="Телефон">
            <input name="phone" type="tel" autoComplete="tel" placeholder="пр. 070123456" required className={inputCls} />
          </Field>
          <Field label="Лозинка">
            <input name="password" type="password" autoComplete="new-password" placeholder="мин. 8 знаци" minLength={8} required className={inputCls} />
          </Field>
          {/*
            Портретната слика е ЗАДОЛЖИТЕЛНА поради безбедност и доверба:
            при заедничко патување со непознати лица, возачот и патникот треба
            визуелно да се препознаат на местото на качување; сликата го
            намалува ризикот од лажни профили и обезбедува отчетност (јасно е
            кој е во возилото). Ова е клучен trust-фактор за carpool платформа.
          */}
          <fieldset>
            <legend className="label">Како ќе ја користиш платформата?</legend>
            <div className="grid grid-cols-3 gap-2">
              <RoleOption value="passenger" icon="user" label="Патник" defaultChecked />
              <RoleOption value="driver" icon="car" label="Возач" />
              <RoleOption value="both" icon="users" label="Двете" />
            </div>
          </fieldset>
          <label className="block">
            <span className="label">Портретна слика</span>
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required
              className="w-full cursor-pointer rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-3 text-sm text-slate-600
                         transition hover:border-brand hover:bg-brand/5
                         file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5
                         file:font-semibold file:text-white file:transition hover:file:bg-brand-dark" />
            <span className="mt-1.5 flex gap-1.5 text-xs leading-relaxed text-slate-500">
              <Icon name="camera" size={14} className="mt-0.5 shrink-0" />
              Јасна слика од лицето — возачот и патникот да се препознаат при качување. JPG, PNG или WEBP до 5MB.
            </span>
          </label>
          <button className="btn-primary mt-2 w-full">Креирај профил</button>
        </form>
    </AuthShell>
  );
}

function RoleOption({ value, icon, label, defaultChecked }: { value: string; icon: IconName; label: string; defaultChecked?: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name="role" value={value} defaultChecked={defaultChecked} required className="peer sr-only" />
      <span className="flex flex-col items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-sm font-semibold text-slate-600 transition
                       hover:border-slate-300 peer-checked:border-brand peer-checked:bg-brand/5 peer-checked:text-brand-dark peer-checked:ring-4 peer-checked:ring-brand/10
                       peer-focus-visible:ring-4 peer-focus-visible:ring-brand/30">
        <Icon name={icon} size={20} />
        {label}
      </span>
    </label>
  );
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

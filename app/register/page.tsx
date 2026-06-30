import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadAvatar } from "@/lib/storage/avatar";

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
  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30";
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-10">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="blob -right-20 top-0 h-96 w-96 animate-blob bg-brand-light/50" />
        <div className="blob -left-16 bottom-0 h-80 w-80 animate-blob bg-teal-200/50" style={{ animationDelay: "4s" }} />
        <div className="absolute inset-0 bg-hero-radial" />
      </div>

      <div className="reveal glass w-full max-w-md rounded-3xl p-8 shadow-lift">
        <Link href="/" className="mb-8 block text-center text-xl font-bold text-gradient">
          Macedonia Ride
        </Link>
        <h1 className="mb-6 text-2xl font-semibold">Регистрација</h1>
        {searchParams.error && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {searchParams.error}
          </p>
        )}
        <p className="mb-4 rounded-xl bg-brand/5 p-3 text-xs leading-relaxed text-brand-dark">
          Сите полиња се задолжителни <span className="text-red-500">*</span>. Секоја
          регистрација се прегледува рачно — профилот се активира откако админ ќе ги
          потврди податоците.
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
            <input name="email" type="email" placeholder="Email" required className={inputCls} />
          </Field>
          <Field label="Телефон">
            <input name="phone" type="tel" placeholder="пр. 070123456" required className={inputCls} />
          </Field>
          <Field label="Лозинка">
            <input name="password" type="password" placeholder="мин. 8 знаци" required className={inputCls} />
          </Field>
          {/*
            Портретната слика е ЗАДОЛЖИТЕЛНА поради безбедност и доверба:
            при заедничко патување со непознати лица, возачот и патникот треба
            визуелно да се препознаат на местото на качување; сликата го
            намалува ризикот од лажни профили и обезбедува отчетност (јасно е
            кој е во возилото). Ова е клучен trust-фактор за carpool платформа.
          */}
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">
              Портретна слика <span className="text-red-500">*</span>
              <span className="ml-1 text-xs font-normal text-slate-400">(задолжително)</span>
            </span>
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required
              className="w-full rounded-xl border border-slate-200 bg-white/80 px-4 py-2.5 text-sm
                         file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5
                         file:text-white file:transition hover:file:bg-brand-dark" />
            <span className="mt-1.5 block text-xs leading-relaxed text-slate-500">
              Потребна е за безбедност и доверба — возачот и патникот да се
              препознаат при качување и да се спречат лажни профили.
            </span>
          </label>
          <Field label="Улога">
            <select name="role" className={inputCls} defaultValue="passenger" required>
              <option value="passenger">Патник</option>
              <option value="driver">Возач</option>
              <option value="both">И патник и возач</option>
            </select>
          </Field>
          <button className="btn-primary mt-1">Креирај профил</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Веќе имаш профил?{" "}
          <Link href="/login" className="font-medium text-brand-dark hover:underline">
            Најави се
          </Link>
        </p>
      </div>
    </main>
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
    <label className={`text-sm ${className ?? ""}`}>
      <span className="mb-1 block font-medium text-slate-600">
        {label} <span className="text-red-500">*</span>
      </span>
      {children}
    </label>
  );
}

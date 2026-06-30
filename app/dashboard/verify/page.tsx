import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { uploadAvatar } from "@/lib/storage/avatar";

const PATH = "/dashboard/verify";

async function resubmitVerification(formData: FormData) {
  "use server";
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const photo = formData.get("photo") as File | null;
  if (!photo || photo.size === 0) {
    redirect(`${PATH}?error=${encodeURIComponent("Качи нова портретна слика.")}`);
  }

  let profile_image: string;
  try {
    profile_image = await uploadAvatar(user.id, photo!);
  } catch (e: any) {
    redirect(`${PATH}?error=${encodeURIComponent(e?.message ?? "Грешка при качување.")}`);
    return;
  }

  // Нова слика + враќање во „на чекање" за повторен преглед од админ.
  const admin = createAdminClient();
  await admin.from("users").update({ profile_image, status: "pending" }).eq("id", user.id);

  redirect("/dashboard/passenger");
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("users")
    .select("profile_image, status")
    .eq("id", user!.id)
    .single();

  // Ако веќе не е под верификација, нема потреба од оваа страница.
  if (me && me.status !== "needs_verification") redirect("/dashboard/passenger");

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold">Дополнителна верификација</h1>
      <p className="mt-2 text-sm text-slate-600">
        Администраторот побара повторна потврда на твојата фотографија (можеби
        претходната не беше јасна или веродостојна). Качи нова, јасна портретна
        слика на која ти се гледа лицето. По прегледот, профилот повторно ќе биде
        активиран.
      </p>

      <form action={resubmitVerification} className="reveal card-hover mt-6 p-6">
        {searchParams.error && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{searchParams.error}</p>
        )}

        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden rounded-full bg-slate-100 ring-2 ring-brand/20">
            {me?.profile_image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={me.profile_image} alt="Тековна" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">нема</div>
            )}
          </div>
          <label className="text-sm">
            <span className="mb-1 block font-medium text-slate-600">Нова портретна слика *</span>
            <input name="photo" type="file" accept="image/png,image/jpeg,image/webp" required
              className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-white hover:file:bg-brand-dark" />
          </label>
        </div>

        <button className="btn-primary mt-5 !py-2.5">Испрати за преглед</button>
      </form>
    </div>
  );
}

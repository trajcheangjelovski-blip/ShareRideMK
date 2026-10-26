import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "@/components/AuthShell";

// Only same-site paths are allowed as a post-login target (no open redirect).
function safeNext(value: unknown): string {
  const s = typeof value === "string" ? value : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.startsWith("/\\") ? s : "/dashboard/passenger";
}

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const next = safeNext(formData.get("next"));
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(
      error.message === "Invalid login credentials" ? "Погрешен email или лозинка." : error.message
    )}&redirect=${encodeURIComponent(next)}`);
  }

  // Целосно блокирани / избришани профили не смеат да останат логирани.
  const { data: profile } = await supabase
    .from("users")
    .select("status")
    .eq("id", data.user!.id)
    .single();
  if (profile && (profile.status === "blocked" || profile.status === "deleted")) {
    await supabase.auth.signOut();
    redirect("/login?blocked=1");
  }

  redirect(next);
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; blocked?: string; redirect?: string };
}) {
  return (
    <AuthShell
      title="Добредојде назад"
      subtitle="Најави се за да резервираш или објавиш патување."
      footer={<>Немаш профил?{" "}<Link href="/register" className="font-semibold text-brand-dark hover:underline">Регистрирај се</Link></>}
    >
      {searchParams.blocked && (
        <p className="alert-error mb-4">
          Профилот е блокиран и не може да се најави. Ако мислиш дека е грешка, контактирај нè.
        </p>
      )}
      {searchParams.error && <p className="alert-error mb-4">{searchParams.error}</p>}
      <form action={login} className="flex flex-col gap-4">
        <input type="hidden" name="next" value={safeNext(searchParams.redirect)} />
        <label className="block">
          <span className="label">Email</span>
          <input name="email" type="email" autoComplete="email" placeholder="ime@primer.mk" required className="input py-3" />
        </label>
        <label className="block">
          <span className="label">Лозинка</span>
          <input name="password" type="password" autoComplete="current-password" placeholder="••••••••" required className="input py-3" />
        </label>
        <button className="btn-primary mt-2 w-full">Најави се</button>
      </form>
    </AuthShell>
  );
}

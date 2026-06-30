import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function login(formData: FormData) {
  "use server";
  const email = String(formData.get("email"));
  const password = String(formData.get("password"));
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
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

  redirect("/dashboard/passenger");
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; blocked?: string };
}) {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6">
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="blob -left-20 top-0 h-96 w-96 animate-blob bg-brand-light/50" />
        <div className="blob -right-16 bottom-0 h-80 w-80 animate-blob bg-cyan-300/40" style={{ animationDelay: "4s" }} />
        <div className="absolute inset-0 bg-hero-radial" />
      </div>

      <div className="reveal glass w-full max-w-md rounded-3xl p-8 shadow-lift">
        <Link href="/" className="mb-8 block text-center text-xl font-bold text-gradient">
          Macedonia Ride
        </Link>
        <h1 className="mb-6 text-2xl font-semibold">Најава</h1>
        {searchParams.blocked && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            Профилот е блокиран и не може да се најави. Ако мислиш дека е грешка, контактирај нè.
          </p>
        )}
        {searchParams.error && (
          <p className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">
            {searchParams.error}
          </p>
        )}
        <form action={login} className="flex flex-col gap-4">
          <input name="email" type="email" placeholder="Email" required
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30" />
          <input name="password" type="password" placeholder="Лозинка" required
            className="rounded-xl border border-slate-200 bg-white/80 px-4 py-3 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30" />
          <button className="btn-primary mt-1">Најави се</button>
        </form>
        <p className="mt-5 text-center text-sm text-slate-600">
          Немаш профил?{" "}
          <Link href="/register" className="font-medium text-brand-dark hover:underline">
            Регистрирај се
          </Link>
        </p>
      </div>
    </main>
  );
}

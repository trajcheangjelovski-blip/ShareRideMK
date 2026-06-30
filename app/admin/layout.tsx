import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, first_name")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") redirect("/dashboard/passenger");

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-60 shrink-0 border-r border-slate-200/70 bg-gradient-to-b from-slate-900 to-slate-800 p-4 text-slate-200 sm:block">
        <Link href="/" className="block text-lg font-bold text-white">
          Macedonia Ride
        </Link>
        <p className="mt-1 text-xs text-slate-400">Админ · {profile?.first_name}</p>

        <nav className="mt-6 flex flex-col gap-1 text-sm">
          <AdminLink href="/admin">Преглед</AdminLink>
          <AdminLink href="/admin/users">Корисници</AdminLink>
          <AdminLink href="/admin/trips">Патувања</AdminLink>
          <AdminLink href="/admin/bookings">Резервации</AdminLink>
          <AdminLink href="/admin/reports">Пријави</AdminLink>
        </nav>

        <form action="/auth/signout" method="post" className="mt-8">
          <button className="text-xs text-slate-400 hover:text-red-400">Одјави се</button>
        </form>
      </aside>

      <main className="flex-1 bg-slate-50 p-6">{children}</main>
    </div>
  );
}

function AdminLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="rounded-lg px-3 py-2 font-medium text-slate-300 transition-all duration-200 hover:translate-x-0.5 hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}

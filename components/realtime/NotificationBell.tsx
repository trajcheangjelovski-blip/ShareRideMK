"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  type: string;
  data: { href?: string } | null;
  is_read: boolean;
  created_at: string;
};

// Bell with unread badge; new notifications arrive over Supabase Realtime
// (rows are created by DB triggers — see migration 0007).
export function NotificationBell({ userId, align = "left" }: { userId: string; align?: "left" | "right" }) {
  const supabase = createClient();
  const router = useRouter();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("notifications")
      .select("id, title, message, type, data, is_read, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20)
      .then(({ data }) => active && setItems((data as Notification[]) ?? []));

    const channel = supabase
      // Unique topic: the layout mounts a bell for desktop and one for mobile.
      .channel(`notifications:${userId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        (payload) => setItems((prev) => [payload.new as Notification, ...prev].slice(0, 20)),
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const unread = items.filter((n) => !n.is_read).length;

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    setItems((prev) => prev.map((n) => (ids.includes(n.id) ? { ...n, is_read: true } : n)));
    await supabase.from("notifications").update({ is_read: true }).in("id", ids);
  }

  async function openItem(n: Notification) {
    setOpen(false);
    await markRead([n.id]);
    if (n.data?.href) router.push(n.data.href);
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Известувања${unread ? ` (${unread} непрочитани)` : ""}`}
        className="relative rounded-full p-2 text-slate-600 transition hover:bg-brand/10 hover:text-brand-dark"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className={`absolute z-40 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden card shadow-lift ${align === "right" ? "right-0" : "left-0"}`}>
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <p className="text-sm font-semibold">Известувања</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={() => markRead(items.filter((n) => !n.is_read).map((n) => n.id))}
                className="text-xs font-medium text-brand-dark hover:underline"
              >
                Означи сè како прочитано
              </button>
            )}
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && <li className="p-4 text-sm text-slate-500">Немаш известувања.</li>}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => openItem(n)}
                  className={`block w-full px-4 py-3 text-left transition hover:bg-slate-50 ${n.is_read ? "" : "bg-brand/5"}`}
                >
                  <p className="flex items-start gap-2 text-sm font-medium">
                    {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand" />}
                    {n.title}
                  </p>
                  {n.message && <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">{n.message}</p>}
                  <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(n.created_at)}</p>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

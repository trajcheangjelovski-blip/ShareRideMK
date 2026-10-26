"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatDateTime } from "@/lib/format";

type Message = {
  id: string;
  sender_id: string;
  receiver_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
};

// Realtime chat between the passenger and driver of one booking.
// RLS (migration 0006) only lets the two parties read and write.
export function Chat({
  bookingId,
  tripId,
  meId,
  otherId,
  otherName,
  readOnly = false,
}: {
  bookingId: string;
  tripId: string;
  meId: string;
  otherId: string;
  otherName: string;
  readOnly?: boolean;
}) {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    supabase
      .from("messages")
      .select("id, sender_id, receiver_id, message, created_at, read_at")
      .eq("booking_id", bookingId)
      .order("created_at")
      .then(({ data }) => {
        if (!active) return;
        setMessages((data as Message[]) ?? []);
        markRead((data as Message[]) ?? []);
      });

    const channel = supabase
      .channel(`chat:${bookingId}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          markRead([m]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages", filter: `booking_id=eq.${bookingId}` },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? { ...x, read_at: m.read_at } : x)));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [bookingId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    list.current?.scrollTo({ top: list.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  function markRead(ms: Message[]) {
    const ids = ms.filter((m) => m.receiver_id === meId && !m.read_at).map((m) => m.id);
    if (ids.length) supabase.from("messages").update({ read_at: new Date().toISOString() }).in("id", ids).then(() => {});
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { data, error } = await supabase
      .from("messages")
      .insert({ booking_id: bookingId, trip_id: tripId, sender_id: meId, receiver_id: otherId, message: body })
      .select("id, sender_id, receiver_id, message, created_at, read_at")
      .single();
    setSending(false);
    if (error) {
      setError("Пораката не е испратена.");
      return;
    }
    setText("");
    setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as Message]));
  }

  return (
    <div id="chat" className="flex flex-col overflow-hidden card">
      <div className="border-b px-4 py-2.5 text-sm font-semibold">Разговор со {otherName}</div>
      <div ref={list} className="h-72 space-y-2 overflow-y-auto bg-slate-50 p-3">
        {messages.length === 0 && (
          <p className="pt-20 text-center text-xs text-slate-400">
            Договорете се за точното место и време на качување.
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === meId;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "rounded-br-sm bg-brand text-white" : "rounded-bl-sm bg-white shadow-soft"}`}>
                <p className="whitespace-pre-wrap break-words">{m.message}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-white/70" : "text-slate-400"}`}>
                  {formatDateTime(m.created_at)}{mine && m.read_at ? " · прочитано" : ""}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      {readOnly ? (
        <p className="border-t px-4 py-3 text-xs text-slate-500">Разговорот е затворен.</p>
      ) : (
        <form onSubmit={send} className="flex gap-2 border-t p-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={1000}
            placeholder="Напиши порака…"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
          />
          <button disabled={sending || !text.trim()} className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-dark disabled:opacity-50">
            Испрати
          </button>
        </form>
      )}
      {error && <p className="px-4 pb-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

// Date/time helpers. All dates are interpreted in Macedonian local time.

const TZ = "Europe/Skopje";

// Today as YYYY-MM-DD in Skopje (for "upcoming only" filters).
export function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date());
}

// Current Skopje time as "YYYY-MM-DD HH:MM" (comparable with date + time strings).
export function nowSkopje(): string {
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
}

// "2026-10-26" → "пон, 26 окт"
export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("mk-MK", { weekday: "short", day: "numeric", month: "short" });
}

// "08:30:00" → "08:30"
export function formatTime(t?: string | null): string {
  return t ? t.slice(0, 5) : "";
}

// ISO timestamp → "26 окт, 14:05"
export function formatDateTime(ts?: string | null): string {
  if (!ts) return "";
  return new Date(ts).toLocaleString("mk-MK", {
    timeZone: TZ, day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

export function fullName(p?: { first_name?: string | null; last_initial?: string | null } | null): string {
  if (!p?.first_name) return "Корисник";
  return p.last_initial ? `${p.first_name} ${p.last_initial}.` : p.first_name;
}

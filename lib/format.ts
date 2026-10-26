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

// Names are spelled out instead of using toLocaleString("mk-MK"): browsers
// without Macedonian locale data silently fall back to English ("Oct 26, 03:34 PM"),
// and server and client output must match.
const MONTHS = ["јан", "фев", "мар", "апр", "мај", "јун", "јул", "авг", "сеп", "окт", "ное", "дек"];
const WEEKDAYS = ["нед", "пон", "вто", "сре", "чет", "пет", "саб"];

// "2026-10-26" → "пон, 26 окт"
export function formatDate(iso?: string | null): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const weekday = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${WEEKDAYS[weekday]}, ${d} ${MONTHS[m - 1]}`;
}

// "08:30:00" → "08:30"
export function formatTime(t?: string | null): string {
  return t ? t.slice(0, 5) : "";
}

// ISO timestamp → "26 окт, 14:05" (Skopje time)
export function formatDateTime(ts?: string | null): string {
  if (!ts) return "";
  const p = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(ts));
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return `${Number(get("day"))} ${MONTHS[Number(get("month")) - 1]}, ${get("hour")}:${get("minute")}`;
}

export function fullName(p?: { first_name?: string | null; last_initial?: string | null } | null): string {
  if (!p?.first_name) return "Корисник";
  return p.last_initial ? `${p.first_name} ${p.last_initial}.` : p.first_name;
}

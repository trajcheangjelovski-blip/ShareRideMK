"use client";

import { useState } from "react";

const ASPECTS = {
  passenger_to_driver: [
    ["punctuality", "Точност"],
    ["driving_safety", "Безбедно возење"],
    ["communication", "Комуникација"],
    ["cleanliness", "Чистота на возилото"],
  ],
  driver_to_passenger: [
    ["punctuality", "Точност"],
    ["communication", "Комуникација"],
    ["behavior", "Однесување"],
  ],
} as const;

// Star rating form; posts to a server action with booking_id + review_type.
export function ReviewForm({
  action,
  bookingId,
  reviewType,
  otherName,
}: {
  action: (formData: FormData) => void | Promise<void>;
  bookingId: string;
  reviewType: keyof typeof ASPECTS;
  otherName: string;
}) {
  const [rating, setRating] = useState(0);
  return (
    <form action={action} className="space-y-4 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
      <input type="hidden" name="booking_id" value={bookingId} />
      <input type="hidden" name="review_type" value={reviewType} />
      <div>
        <p className="font-semibold">Оцени го патувањето со {otherName}</p>
        <p className="text-xs text-slate-500">Оценките се јавни и им помагаат на другите да патуваат побезбедно.</p>
      </div>

      <Stars name="rating" label="Вкупна оцена" value={rating} onChange={setRating} large />
      <div className="grid gap-3 sm:grid-cols-2">
        {ASPECTS[reviewType].map(([name, label]) => (
          <StarsUncontrolled key={name} name={name} label={label} />
        ))}
      </div>

      <textarea name="comment" rows={2} maxLength={500} placeholder="Коментар (опционално)"
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm" />
      <button disabled={rating === 0} className="btn-primary !py-2 text-sm disabled:opacity-50">
        Испрати оцена
      </button>
    </form>
  );
}

function StarsUncontrolled({ name, label }: { name: string; label: string }) {
  const [v, setV] = useState(0);
  return <Stars name={name} label={label} value={v} onChange={setV} />;
}

function Stars({
  name, label, value, onChange, large = false,
}: {
  name: string; label: string; value: number; onChange: (v: number) => void; large?: boolean;
}) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="text-sm">
      <p className="mb-1 text-slate-600">{label}</p>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)} role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} од 5`}
            onClick={() => onChange(n)}
            onMouseEnter={() => setHover(n)}
            className={`${large ? "text-3xl" : "text-xl"} leading-none transition ${n <= shown ? "text-amber-400" : "text-slate-300"} hover:scale-110`}
          >
            ★
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value || ""} />
    </div>
  );
}

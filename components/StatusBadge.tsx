// Booking and trip statuses with Macedonian labels.
const STATUS: Record<string, { label: string; cls: string }> = {
  // bookings
  pending: { label: "Во чекање", cls: "bg-amber-100 text-amber-800" },
  approved: { label: "Одобрено", cls: "bg-green-100 text-green-800" },
  rejected: { label: "Одбиено", cls: "bg-red-100 text-red-800" },
  cancelled_by_passenger: { label: "Откажано", cls: "bg-slate-100 text-slate-600" },
  cancelled_by_driver: { label: "Откажано од возач", cls: "bg-red-100 text-red-800" },
  no_show: { label: "Не се појави", cls: "bg-red-100 text-red-800" },
  completed: { label: "Завршено", cls: "bg-slate-100 text-slate-700" },
  // trips
  draft: { label: "Нацрт", cls: "bg-slate-100 text-slate-600" },
  published: { label: "Објавено", cls: "bg-brand/10 text-brand-dark" },
  scheduled: { label: "Закажано", cls: "bg-brand/10 text-brand-dark" },
  driver_on_the_way: { label: "Возачот тргна", cls: "bg-cyan-100 text-cyan-800" },
  arrived_at_pickup: { label: "На место за качување", cls: "bg-cyan-100 text-cyan-800" },
  passenger_picked_up: { label: "Во тек", cls: "bg-cyan-100 text-cyan-800" },
  in_progress: { label: "Во тек", cls: "bg-cyan-100 text-cyan-800" },
  cancelled: { label: "Откажано", cls: "bg-red-100 text-red-800" },
};

export function statusLabel(status: string): string {
  return STATUS[status]?.label ?? status;
}

export function StatusBadge({ status }: { status: string }) {
  const s = STATUS[status];
  return (
    <span className={`whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${s?.cls ?? "bg-slate-100 text-slate-700"}`}>
      {s?.label ?? status}
    </span>
  );
}

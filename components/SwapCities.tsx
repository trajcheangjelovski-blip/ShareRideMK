"use client";

import { Icon } from "@/components/Icon";

// Swaps the "from" and "to" selects of the surrounding form.
export function SwapCities({ className }: { className?: string }) {
  return (
    <button
      type="button"
      aria-label="Замени ги градовите"
      title="Замени ги градовите"
      className={className}
      onClick={(e) => {
        const form = e.currentTarget.closest("form");
        const from = form?.querySelector<HTMLSelectElement>('select[name="from"]');
        const to = form?.querySelector<HTMLSelectElement>('select[name="to"]');
        if (from && to) [from.value, to.value] = [to.value, from.value];
      }}
    >
      <Icon name="swapv" size={16} className="sm:hidden" />
      <Icon name="swap" size={16} className="hidden sm:block" />
    </button>
  );
}

import Link from "next/link";
import { Icon } from "@/components/Icon";

// Brand mark: route glyph in a gradient tile + wordmark.
// `collapse` hides the wordmark on very narrow phones (crowded headers).
export function Logo({ href = "/", light = false, compact = false, collapse = false }: { href?: string; light?: boolean; compact?: boolean; collapse?: boolean }) {
  return (
    <Link href={href} className="group inline-flex items-center gap-2.5" aria-label="Macedonia Ride — почетна">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-glow transition-transform duration-300 group-hover:-rotate-6">
        <Icon name="route" size={19} strokeWidth={2.2} />
      </span>
      {!compact && (
        <span className={`text-[17px] font-extrabold tracking-tight ${light ? "text-white" : "text-ink"} ${collapse ? "max-[420px]:hidden" : ""}`}>
          Macedonia<span className={light ? "text-brand-light" : "text-brand"}>Ride</span>
        </span>
      )}
    </Link>
  );
}

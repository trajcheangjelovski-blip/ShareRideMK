// Round profile photo with a neutral placeholder.
export function Avatar({ src, size = 20 }: { src?: string | null; size?: number }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={size} height={size} className="shrink-0 rounded-full object-cover" style={{ width: size, height: size }} />
  ) : (
    <span className="inline-block shrink-0 rounded-full bg-slate-200" style={{ width: size, height: size }} />
  );
}

import { useId } from "react";
import { cn } from "@/lib/utils";

export function LezgoMark({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId().replace(/:/g, "");
  const g = `lzg-${id}`;
  return (
    <svg width={size} height={size * 1.18} viewBox="0 0 100 118" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#A855F7" />
          <stop offset=".55" stopColor="#FF5E7E" />
          <stop offset="1" stopColor="#FF9F43" />
        </linearGradient>
      </defs>
      <path d="M50 4C25 4 7 22 7 46c0 28 30 54 39 64a5.5 5.5 0 0 0 8 0c9-10 39-36 39-64C93 22 75 4 50 4Z" fill={`url(#${g})`} />
      <circle cx="50" cy="46" r="27" fill="#fff" />
      <circle cx="40" cy="41" r="4.2" fill="#3b0764" />
      <path d="M55 41.5q5.5-5 11 0" stroke="#3b0764" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M38 52q12 12 24 0" stroke="#3b0764" strokeWidth="4.2" strokeLinecap="round" fill="none" />
      <circle cx="34" cy="51" r="3.6" fill="#FF5E7E" opacity=".45" />
      <circle cx="66" cy="51" r="3.6" fill="#FF5E7E" opacity=".45" />
    </svg>
  );
}

export function LezgoLogo({ size = 32, wordmark = true, className }: { size?: number; wordmark?: boolean; className?: string }) {
  return (
    <span className={cn("lz-logo inline-flex items-center gap-2", className)}>
      <LezgoMark size={size} className="lz-mark drop-shadow-[0_4px_10px_rgba(255,94,126,.35)]" />
      {wordmark && <span className="lz-word font-display font-extrabold tracking-tight" style={{ fontSize: size * 0.68 }}>Lezgo</span>}
    </span>
  );
}

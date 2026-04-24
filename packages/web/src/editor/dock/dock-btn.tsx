import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  active?: boolean;
  onClick?: () => void;
}

export function DockBtn({
  icon: Icon,
  label,
  shortcut,
  active,
  onClick,
}: Props) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`group relative flex flex-col items-center justify-center gap-0.5 md:gap-1 w-[48px] h-[48px] md:w-[68px] md:h-[68px] rounded-lg hover-fade overflow-hidden ${
        active ? "text-accent" : "text-ink-200 hover:text-ink-50"
      }`}
    >
      {/* Active background layers */}
      {active && (
        <>
          <div
            className="absolute inset-0 bg-gradient-to-b from-accent/15 to-accent/5"
            aria-hidden
          />
          <div
            className="absolute inset-0 ring-1 ring-inset ring-accent/40 rounded-lg"
            aria-hidden
          />
          <div
            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-accent rounded-t-full"
            aria-hidden
          />
        </>
      )}

      {/* Hover wash */}
      {!active && (
        <div
          className="absolute inset-0 bg-gradient-to-b from-white/[0.06] to-white/0 opacity-0 group-hover:opacity-100 transition-opacity"
          aria-hidden
        />
      )}

      <Icon
        size={20}
        className={`relative ${
          active
            ? "drop-shadow-[0_0_6px_var(--color-accent)]"
            : "motion-safe:group-hover:scale-110 transition-transform"
        }`}
      />
      <span className="relative text-[9px] md:text-[10.5px] font-semibold tracking-tight">
        {label}
      </span>

      {shortcut && (
        <span
          className={`hidden md:flex absolute top-1 right-1 items-center justify-center min-w-[14px] h-[14px] px-1 rounded-[3px] text-[8.5px] font-mono font-semibold leading-none ${
            active
              ? "bg-accent/20 text-accent"
              : "bg-ink-800/70 text-ink-400 group-hover:text-ink-100 group-hover:bg-ink-700"
          }`}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}

import type { ReactNode } from "react";

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-[3px] bg-ink-800 border border-white/8 text-ui-2xs font-mono text-ink-300 leading-none">
      {children}
    </kbd>
  );
}

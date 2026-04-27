import type { ReactNode } from "react";

export function DockGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-0.5 px-1">
      {children}
    </div>
  );
}

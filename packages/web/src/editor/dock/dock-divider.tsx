export function DockDivider() {
  return (
    <div className="relative mx-1 h-12 w-px" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/12 to-transparent" />
    </div>
  );
}

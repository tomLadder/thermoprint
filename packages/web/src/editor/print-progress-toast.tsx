import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { useEditorV2Store } from "../store/editor-store.ts";

export function PrintProgressToast() {
  const printing = useEditorV2Store((s) => s.printing);
  const copies = useEditorV2Store((s) => s.printingCopies);
  const startedAt = useEditorV2Store((s) => s.printingStartedAt);
  const duration = useEditorV2Store((s) => s.printingDuration);
  const progress = useEditorV2Store((s) => s.printProgress);
  const printerName = useEditorV2Store((s) => s.printer.name);
  const connected = useEditorV2Store((s) => s.printer.connected);

  const [estimatedPct, setEstimatedPct] = useState(0);
  const [done, setDone] = useState(false);

  // Time-based fallback animation (used when no real progress events)
  useEffect(() => {
    if (!printing) return;
    setEstimatedPct(0);
    setDone(false);

    let raf = 0;
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const t = Math.max(0, Math.min(1, elapsed / duration));
      const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
      setEstimatedPct(eased * 100);
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        setEstimatedPct(100);
        setDone(true);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [printing, startedAt, duration]);

  if (!printing) return null;

  // Use real progress when available, otherwise fall back to time estimate
  const hasRealProgress = progress !== null && progress.totalBytes > 0;
  const pct = hasRealProgress
    ? (progress.bytesSent / progress.totalBytes) * 100
    : estimatedPct;
  const isComplete = hasRealProgress ? progress.bytesSent >= progress.totalBytes : done;

  const n = copies || 1;
  const displayPct = Math.round(pct);
  const currentLabel = Math.min(n, Math.max(1, Math.ceil((pct / 100) * n)));
  const dest = connected && printerName ? printerName : "printer";

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute top-20 right-3 z-50 w-[360px] rounded-xl bg-ink-850/95 backdrop-blur-sm border border-accent/30 shadow-panel overflow-hidden"
    >
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 pt-3 pb-2">
        <div className="relative w-5 h-5 flex items-center justify-center">
          {isComplete ? (
            <div className="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
              <Check size={14} className="text-accent" strokeWidth={2.2} />
            </div>
          ) : (
            <>
              <div className="absolute inset-0 rounded-full border-2 border-accent/15" />
              <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-accent animate-spin" />
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="text-ui-base text-ink-50 font-semibold truncate">
            {isComplete ? "Printed to" : "Printing to"} {dest}
          </div>
          <div className="text-ui-xs font-mono text-ink-400 mt-0.5">
            {isComplete
              ? `${n} ${n === 1 ? "label" : "labels"} · complete`
              : `Label ${currentLabel} of ${n} · 203 dpi`}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[18px] font-mono font-semibold text-ink-50 tabular-nums leading-none">
            {displayPct}
            <span className="text-ui-sm text-ink-400 font-normal">%</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1 bg-ink-900 mx-4 mb-2 rounded-full overflow-hidden">
        <div
          className="absolute inset-y-0 left-0 bg-accent rounded-full transition-[width] duration-75 ease-linear"
          style={{
            width: `${pct}%`,
            boxShadow: isComplete ? "none" : "0 0 8px color-mix(in srgb, var(--color-accent) 60%, transparent)",
          }}
        />
        {!isComplete && (
          <div
            className="absolute inset-y-0 w-16 -translate-x-16 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{
              left: `${pct}%`,
              animation: "shimmer 1.1s ease-in-out infinite",
            }}
          />
        )}
      </div>

      {/* Per-label ticks (2–50 copies only) */}
      {n > 1 && n <= 50 && (
        <div className="flex items-center gap-0.5 px-4 pb-3">
          {Array.from({ length: n }).map((_, i) => {
            const perChunk = 100 / n;
            const chunkPct = Math.max(
              0,
              Math.min(1, (pct - i * perChunk) / perChunk),
            );
            return (
              <div
                key={i}
                className="flex-1 h-[3px] bg-ink-800 rounded-full overflow-hidden"
              >
                <div
                  className="h-full bg-accent/80 rounded-full"
                  style={{
                    width: `${chunkPct * 100}%`,
                    transition: "width 80ms linear",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}
      {(n === 1 || n > 50) && <div className="h-2" />}
    </div>
  );
}

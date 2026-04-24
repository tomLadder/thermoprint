import { useState, useEffect, useRef, useCallback } from "react";
import { Printer, ChevronDown, X, Plus, Minus } from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-400">{label}</span>
      <span className="text-ink-200 font-mono">{value}</span>
    </div>
  );
}

interface PrintButtonProps {
  onPrint: (copies: number) => Promise<boolean>;
}

export function PrintButton({ onPrint }: PrintButtonProps) {
  const [open, setOpen] = useState(false);
  const [copies, setCopies] = useState(() => {
    try {
      return parseInt(localStorage.getItem("tp.copies") || "1", 10) || 1;
    } catch {
      return 1;
    }
  });
  const ref = useRef<HTMLDivElement>(null);

  const label = useEditorV2Store((s) => s.label);
  const paperType = useEditorV2Store((s) => s.paperType);
  const printer = useEditorV2Store((s) => s.printer);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const clamp = (n: number) => Math.max(1, Math.min(999, n | 0));
  const setN = useCallback((n: number) => {
    const v = clamp(n);
    setCopies(v);
    try {
      localStorage.setItem("tp.copies", String(v));
    } catch {
      /* noop */
    }
  }, []);

  const fire = useCallback(async () => {
    // If no printer is connected, open the connect flow instead
    if (!printer.connected) {
      setOpen(false);
      useEditorV2Store.setState((s) => ({
        connectFlow: { ...s.connectFlow, open: true, step: "idle" },
      }));
      return;
    }

    const duration = Math.min(4500, 1200 + copies * 220);
    useEditorV2Store.getState().startPrint(copies, duration);
    setOpen(false);

    try {
      const sent = await onPrint(copies);
      if (sent) {
        // Real print done — hold on 100% for 400ms then dismiss
        setTimeout(() => useEditorV2Store.getState().endPrint(), 400);
      } else {
        // No real printer connected — just run the fake progress and dismiss
        setTimeout(() => useEditorV2Store.getState().endPrint(), duration + 400);
      }
    } catch (err) {
      console.error("Print failed:", err);
      useEditorV2Store.getState().endPrint();
    }
  }, [copies, onPrint, printer.connected]);

  return (
    <div className="relative ml-1" ref={ref}>
      <div className="flex items-stretch rounded-md overflow-hidden shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--color-accent)_50%,transparent)]">
        <button
          onClick={fire}
          className="flex items-center gap-2 h-8 pl-2.5 pr-3 bg-accent text-on-accent font-bold text-ui-base hover:bg-accent-600 hover-fade"
        >
          <Printer size={15} />
          Print
          {copies > 1 && (
            <span className="px-1.5 h-4 flex items-center rounded-sm bg-ink-950/15 text-ui-xs font-mono">
              ×{copies}
            </span>
          )}
          <kbd style={{ background: "rgba(0,0,0,0.15)", borderColor: "rgba(0,0,0,0.15)", color: "var(--color-on-accent)" }}>
            ⌘P
          </kbd>
        </button>
        <button
          onClick={() => setOpen((o) => !o)}
          className={`w-7 flex items-center justify-center border-l border-ink-950/20 bg-accent text-on-accent hover:bg-accent-600 hover-fade ${open ? "bg-accent-600" : ""}`}
          title="Print options"
        >
          <ChevronDown size={14} />
        </button>
      </div>

      {open && (
        <div className="fixed right-2 top-14 md:absolute md:right-0 md:top-10 w-[calc(100vw-1rem)] md:w-72 max-w-72 bg-ink-850 border border-white/8 rounded-lg shadow-panel p-3 z-[60]">
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400">
                Print job
              </div>
              <div className="text-sm font-semibold text-ink-50">
                Send to printer
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-ink-400 hover:text-ink-100"
            >
              <X size={16} />
            </button>
          </div>

          {/* Copies stepper */}
          <div className="mb-3">
            <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
              Copies
            </div>
            <div className="flex items-stretch rounded-md bg-ink-800 border border-white/5 overflow-hidden">
              <button
                onClick={() => setN(copies - 1)}
                disabled={copies <= 1}
                className="w-9 flex items-center justify-center text-ink-300 hover:bg-ink-750 hover:text-ink-50 disabled:opacity-40 disabled:hover:bg-transparent"
              >
                <Minus size={14} />
              </button>
              <input
                type="number"
                min={1}
                max={999}
                value={copies}
                onChange={(e) => setN(parseInt(e.target.value || "1", 10))}
                className="flex-1 bg-transparent text-center text-ui-lg font-semibold text-ink-50 outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                onClick={() => setN(copies + 1)}
                disabled={copies >= 999}
                className="w-9 flex items-center justify-center text-ink-300 hover:bg-ink-750 hover:text-ink-50 disabled:opacity-40"
              >
                <Plus size={14} />
              </button>
            </div>
            {/* Quick-pick row */}
            <div className="flex gap-1 mt-1.5">
              {[1, 5, 10, 25, 50].map((n) => (
                <button
                  key={n}
                  onClick={() => setN(n)}
                  className={`flex-1 h-6 rounded text-ui-xs font-mono border ${
                    copies === n
                      ? "bg-accent/15 border-accent/40 text-accent"
                      : "bg-ink-800 border-white/5 text-ink-400 hover:text-ink-100"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Info rows */}
          <div className="space-y-1.5 text-ui-sm mb-3">
            <MiniRow
              label="Printer"
              value={printer.connected ? printer.name : "Not connected"}
            />
            <MiniRow
              label="Media"
              value={`${label.widthMm} × ${label.heightMm} mm · ${paperType}`}
            />
            <MiniRow
              label="Est. time"
              value={`${(copies * 0.6).toFixed(1)}s`}
            />
          </div>

          {/* CTA */}
          <button
            onClick={fire}
            className="w-full h-8 rounded-md bg-accent text-on-accent font-semibold text-ui-base hover:bg-accent-600 flex items-center justify-center gap-2"
          >
            <Printer size={15} />
            Print {copies} {copies === 1 ? "label" : "labels"}
          </button>
        </div>
      )}
    </div>
  );
}

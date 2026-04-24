import { useState, useRef, useEffect } from "react";
import { Download, Copy, Trash2, Check } from "lucide-react";
import { useDebugLog } from "../../hooks/use-debug-log.ts";
import { clearDebugLog, exportDebugLog } from "@thermoprint/core";

export function DebugLogSection() {
  const entries = useDebugLog();
  const [copied, setCopied] = useState(false);

  const count = entries.length;
  const tail = entries.slice(-50);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries arrive
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const download = () => {
    const text = exportDebugLog();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thermoprint-debug-${ts}.log`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportDebugLog());
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // clipboard blocked — download still works
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      {/* Header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-2">
          <span className="text-ui-xs font-mono uppercase tracking-wider text-ink-400">
            Debug log
          </span>
          <span className="text-ui-2xs font-mono text-ink-500 tabular-nums">
            {count} {count === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="relative flex w-1.5 h-1.5">
            <span className="absolute inset-0 rounded-full bg-emerald-400/40 animate-ping" />
            <span className="relative w-1.5 h-1.5 rounded-full bg-emerald-400" />
          </span>
          <span className="text-ui-2xs font-mono uppercase text-ink-400">
            live
          </span>
        </div>
      </div>

      {/* Tail preview */}
      <div ref={scrollRef} className="rounded-md bg-ink-900/60 border border-white/5 p-2 mb-2 font-mono text-ui-xs leading-tight text-ink-300 max-h-[60px] overflow-y-auto">
        {tail.length === 0 ? (
          <div className="text-ink-500 italic">No entries yet</div>
        ) : (
          tail.map((e, i) => (
            <div key={`${e.time}-${i}`} className="flex gap-1.5 truncate">
              <span className="text-ink-500 shrink-0">
                {new Date(e.time).toISOString().slice(11, 19)}
              </span>
              <span className="text-accent shrink-0">[{e.tag}]</span>
              <span className="truncate">{e.message}</span>
            </div>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5">
        <button
          onClick={download}
          disabled={count === 0}
          className="flex-1 h-7 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 text-ui-sm text-ink-100 hover:text-accent flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:hover:text-ink-100"
        >
          <Download size={13} />
          Download .log
        </button>
        <button
          onClick={copy}
          disabled={count === 0}
          title="Copy to clipboard"
          className="w-8 h-7 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 text-ink-300 hover:text-ink-100 flex items-center justify-center disabled:opacity-40"
        >
          {copied ? (
            <Check size={13} className="text-accent" />
          ) : (
            <Copy size={13} />
          )}
        </button>
        <button
          onClick={() => clearDebugLog()}
          disabled={count === 0}
          title="Clear log"
          className="w-8 h-7 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 text-ink-300 hover:text-red-400 flex items-center justify-center disabled:opacity-40"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

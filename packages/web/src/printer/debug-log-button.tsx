import { useState, useCallback, useEffect } from "react";
import { Bug } from "lucide-react";
import { exportDebugLog, getDebugLog, clearDebugLog } from "@thermoprint/core";

export function DebugLogButton() {
  const [open, setOpen] = useState(false);
  const [, forceUpdate] = useState(0);

  const toggle = useCallback(() => {
    setOpen((prev) => !prev);
  }, []);

  const refresh = useCallback(() => {
    forceUpdate((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!open) return;
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, [open, refresh]);

  const download = () => {
    const text = exportDebugLog();
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thermoprint-debug-${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const entries = open ? getDebugLog() : [];

  return (
    <>
      <button
        onClick={toggle}
        className="flex items-center gap-1.5 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
      >
        <Bug size={12} />
        Debug Log
      </button>

      {open && (
        <div className="flex flex-col gap-1.5">
          <div className="flex gap-1.5">
            <button
              onClick={refresh}
              className="flex-1 px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Refresh ({entries.length})
            </button>
            <button
              onClick={download}
              disabled={entries.length === 0}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Download
            </button>
            <button
              onClick={() => { clearDebugLog(); refresh(); }}
              disabled={entries.length === 0}
              className="px-2 py-1 text-xs rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          <div className="max-h-40 overflow-y-auto rounded bg-gray-950 p-2 text-[10px] font-mono text-green-400 leading-tight">
            {entries.length === 0 ? (
              <span className="text-gray-500">No log entries yet</span>
            ) : (
              entries.map((e, i) => {
                const ts = new Date(e.time).toISOString().slice(11, 23);
                return (
                  <div key={i}>
                    {ts} [{e.tag}] {e.message}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}

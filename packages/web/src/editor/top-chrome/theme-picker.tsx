import { useState, useEffect, useRef } from "react";
import { Palette, Sun, Moon } from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";

const THEMES = [
  { id: "cyan",     name: "Cyan",     swatch: "#2ad0ff" },
  { id: "amber",    name: "Amber",    swatch: "#ff9f40" },
  { id: "graphite", name: "Graphite", swatch: "#e6e6eb" },
  { id: "violet",   name: "Violet",   swatch: "#a78bfa" },
  { id: "forest",   name: "Forest",   swatch: "#6ecc93" },
  { id: "paper",    name: "Paper",    swatch: "#e2bc7a" },
];

export function ThemePicker() {
  const theme = useEditorV2Store((s) => s.theme);
  const mode = useEditorV2Store((s) => s.mode);
  const setTheme = useEditorV2Store((s) => s.setTheme);
  const setMode = useEditorV2Store((s) => s.setMode);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);


  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={`w-8 h-8 flex items-center justify-center rounded-md border hover-fade ${
          open
            ? "bg-accent/10 text-accent border-accent/30"
            : "bg-ink-800 text-accent border-white/5 hover:text-accent"
        }`}
        title="Theme"
      >
        <Palette size={15} />
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-56 bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel p-3 z-[60]">
          {/* Dark / Light toggle */}
          <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-ink-800 border border-white/5 mb-2.5">
            {(["dark", "light"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-1.5 h-7 rounded-[4px] text-ui-xs font-medium capitalize ${
                  mode === m
                    ? "bg-ink-700 text-accent"
                    : "text-ink-400 hover:text-ink-100"
                }`}
              >
                {m === "dark" ? <Moon size={12} /> : <Sun size={12} />}
                {m}
              </button>
            ))}
          </div>

          {/* Theme grid */}
          <div className="grid grid-cols-2 gap-1.5">
            {THEMES.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-1.5 h-8 px-2 rounded-md border hover-fade ${
                    active
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "bg-ink-800 border-white/5 text-ink-200 hover:border-white/15"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full shrink-0 ring-1 ring-black/20"
                    style={{ background: t.swatch }}
                  />
                  <span className="text-ui-xs font-medium">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

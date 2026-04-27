import { useState, useEffect, useRef, useMemo } from "react";
import { Search } from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { commands, type Command } from "./commands.ts";

export function Palette() {
  const paletteOpen = useEditorV2Store((s) => s.paletteOpen);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return commands;
    const q = query.toLowerCase();
    return commands.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q),
    );
  }, [query]);

  // Reset cursor on query change
  useEffect(() => {
    setCursor(0);
  }, [query]);

  // Focus input on open, clear on close
  useEffect(() => {
    if (paletteOpen) {
      setTimeout(() => inputRef.current?.focus(), 10);
    } else {
      setQuery("");
    }
  }, [paletteOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!paletteOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        useEditorV2Store.setState({ paletteOpen: false });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setCursor((c) => Math.min(filtered.length - 1, c + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setCursor((c) => Math.max(0, c - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const cmd = filtered[cursor];
        if (cmd) {
          cmd.run();
          useEditorV2Store.setState({ paletteOpen: false });
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paletteOpen, filtered, cursor]);

  if (!paletteOpen) return null;

  // Group commands
  const groups: Record<string, (Command & { i: number })[]> = {};
  filtered.forEach((c, i) => {
    (groups[c.group] ||= []).push({ ...c, i });
  });

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-[2px] flex items-start justify-center pt-24"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget)
          useEditorV2Store.setState({ paletteOpen: false });
      }}
    >
      <div className="w-full max-w-[560px] mx-4 bg-ink-850 border border-white/10 rounded-xl shadow-panel overflow-hidden">
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 h-12 border-b border-white/5">
          <Search size={16} className="text-ink-400" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, template, or label size…"
            className="flex-1 bg-transparent outline-none text-ui-md text-ink-100 placeholder:text-ink-500"
          />
          <kbd>ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto py-1">
          {filtered.length === 0 && (
            <div className="px-4 py-8 text-center text-ui-base text-ink-500">
              No commands match &ldquo;{query}&rdquo;
            </div>
          )}
          {Object.entries(groups).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 pt-2 pb-1 text-ui-2xs font-mono uppercase tracking-[0.15em] text-ink-500">
                {group}
              </div>
              {items.map(({ i, icon: Icon, ...cmd }) => (
                <div
                  key={cmd.id}
                  onMouseEnter={() => setCursor(i)}
                  onClick={() => {
                    cmd.run();
                    useEditorV2Store.setState({ paletteOpen: false });
                  }}
                  className={`flex items-center gap-3 px-4 h-9 cursor-pointer ${
                    cursor === i ? "bg-accent/10" : ""
                  }`}
                >
                  <Icon
                    size={15}
                    className={cursor === i ? "text-accent" : "text-ink-400"}
                  />
                  <span
                    className={`flex-1 text-ui-base ${
                      cursor === i ? "text-ink-50" : "text-ink-200"
                    }`}
                  >
                    {cmd.label}
                  </span>
                  {cmd.shortcut && <kbd>{cmd.shortcut}</kbd>}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 h-8 border-t border-white/5 text-ui-xs text-ink-500">
          <div className="flex items-center gap-3">
            <span>
              <kbd>↑↓</kbd> navigate
            </span>
            <span>
              <kbd>↵</kbd> run
            </span>
          </div>
          <span className="font-mono">{filtered.length} commands</span>
        </div>
      </div>
    </div>
  );
}

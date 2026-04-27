import { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Folder,
  X,
  Search,
  Plus,
  MoreHorizontal,
  Download,
  Upload,
  Copy,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import JsBarcode from "jsbarcode";
import { useEditorV2Store, type BaseElement } from "../../../store/editor-store.ts";
import {
  downloadLabelAsJson,
  downloadLibraryAsZip,
  importLabelFromJson,
  type SavedLabel,
} from "../../../lib/library.ts";

// ---- Thumbnail helpers ----

function useQrDataUrl(content: string, ecl: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const key = `${content}|${ecl}`;
  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(content || " ", {
      errorCorrectionLevel: (ecl as "L" | "M" | "Q" | "H") || "M",
      margin: 1,
      scale: 4,
      color: { dark: "#000000", light: "#ffffff" },
    }).then((dataUrl) => {
      if (!cancelled) setUrl(dataUrl);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [key, content, ecl]);
  return url;
}

function useBarcodeDataUrl(content: string, format: string): string | null {
  return useMemo(() => {
    try {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, content || "0000", {
        format: format || "CODE128",
        displayValue: false,
        margin: 0,
        height: 60,
      });
      return canvas.toDataURL();
    } catch {
      return null;
    }
  }, [content, format]);
}

function QrThumbnail({ el }: { el: BaseElement }) {
  const p = el.props as Record<string, unknown>;
  const url = useQrDataUrl(
    (p.content as string) || "",
    (p.errorCorrectionLevel as string) || "M",
  );
  if (!url) {
    return <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#f0f0f0" />;
  }
  return (
    <image href={url} x={el.x} y={el.y} width={el.width} height={el.height} />
  );
}

function BarcodeThumbnail({ el }: { el: BaseElement }) {
  const p = el.props as Record<string, unknown>;
  const url = useBarcodeDataUrl(
    (p.content as string) || "0000",
    (p.format as string) || "CODE128",
  );
  if (!url) {
    return <rect x={el.x} y={el.y} width={el.width} height={el.height} fill="#f0f0f0" />;
  }
  return (
    <image href={url} x={el.x} y={el.y} width={el.width} height={el.height} preserveAspectRatio="none" />
  );
}

// ---- Thumbnail ----

function LabelThumbnail({
  doc,
  maxW = 200,
  maxH = 92,
}: {
  doc: Pick<SavedLabel, "label" | "elements">;
  maxW?: number;
  maxH?: number;
}) {
  const { label, elements } = doc;
  const s = Math.min(maxW / label.widthPx, maxH / label.heightPx);
  const w = label.widthPx * s;
  const h = label.heightPx * s;

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${label.widthPx} ${label.heightPx}`}
      style={{
        background: "#f5f6f8",
        borderRadius: 2,
        boxShadow: "0 1px 2px rgba(0,0,0,0.4)",
      }}
    >
      {elements.map((el: BaseElement) => {
        switch (el.type) {
          case "text": {
            const p = el.props as Record<string, unknown>;
            const align = (p.align as string) ?? "left";
            const textX =
              align === "center"
                ? el.x + el.width / 2
                : align === "right"
                  ? el.x + el.width
                  : el.x;
            const anchor =
              align === "center"
                ? "middle"
                : align === "right"
                  ? "end"
                  : "start";
            const weight = (p.fontWeight as number) ?? 400;
            const italic = p.italic as boolean | undefined;
            const letterSpacing = (p.letterSpacing as number) ?? 0;
            return (
              <text
                key={el.id}
                x={textX}
                y={el.y + ((p.fontSize as number) ?? 14) * 0.85}
                fontSize={(p.fontSize as number) ?? 14}
                fontFamily={`'${(p.fontFamily as string) ?? "Inter"}', sans-serif`}
                fontWeight={weight}
                fontStyle={italic ? "italic" : "normal"}
                letterSpacing={letterSpacing}
                fill={(p.fill as string) ?? "#000"}
                textAnchor={anchor}
                dominantBaseline="auto"
              >
                {p.text as string}
              </text>
            );
          }
          case "qrcode":
            return <QrThumbnail key={el.id} el={el} />;
          case "barcode":
            return <BarcodeThumbnail key={el.id} el={el} />;
          case "line":
            return (
              <line
                key={el.id}
                x1={el.x}
                y1={el.y}
                x2={el.x + el.width}
                y2={el.y + el.height}
                stroke={(el.props.stroke as string) ?? "#000"}
                strokeWidth={(el.props.strokeWidth as number) ?? 1}
              />
            );
          case "rect":
            return (
              <rect
                key={el.id}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                fill={(el.props.fill as string) || "transparent"}
                stroke={(el.props.stroke as string) ?? "#000"}
                strokeWidth={(el.props.strokeWidth as number) ?? 1}
              />
            );
          case "image": {
            const src = el.props.src as string;
            return src ? (
              <image key={el.id} href={src} x={el.x} y={el.y} width={el.width} height={el.height} />
            ) : (
              <rect key={el.id} x={el.x} y={el.y} width={el.width} height={el.height} fill="#ddd" />
            );
          }
          default:
            return null;
        }
      })}
    </svg>
  );
}

// ---- Relative time ----

function relTime(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 2 * 86_400_000) return "yesterday";
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

// ---- Context menu ----

interface MenuState {
  id: string;
  x: number;
  y: number;
}

// ---- Main ----

interface Props {
  onClose: () => void;
}

export function LibraryFlyout({ onClose }: Props) {
  const library = useEditorV2Store((s) => s.library);
  const currentLabelId = useEditorV2Store((s) => s.currentLabelId);
  const openLabel = useEditorV2Store((s) => s.openLabel);
  const newLabel = useEditorV2Store((s) => s.newLabel);
  const deleteLabel = useEditorV2Store((s) => s.deleteLabel);
  const duplicateLabel = useEditorV2Store((s) => s.duplicateLabel);
  const importLabel = useEditorV2Store((s) => s.importLabel);

  const [query, setQuery] = useState("");
  const [menu, setMenu] = useState<MenuState | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close context menu on outside click
  useEffect(() => {
    if (!menu) return;
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenu(null);
      }
    };
    // Defer so the opening click doesn't immediately close it
    const frame = requestAnimationFrame(() => {
      document.addEventListener("mousedown", h);
    });
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("mousedown", h);
    };
  }, [menu]);

  const filtered = query.trim()
    ? library.labels.filter((l) =>
        l.name.toLowerCase().includes(query.toLowerCase()),
      )
    : library.labels;

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      try {
        const data = await importLabelFromJson(file);
        importLabel(data);
      } catch (err) {
        console.error("Import failed:", err);
      }
    };
    input.click();
  };

  return (
    <div className="fixed inset-x-2 bottom-20 max-h-[80vh] md:max-h-none md:inset-auto md:absolute md:bottom-44 md:left-1/2 md:-translate-x-1/2 md:w-[680px] md:h-[480px] bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-xl shadow-panel z-40 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-white/5 shrink-0 space-y-2">
        {/* Row 1: title + close */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Folder size={16} className="text-accent" />
            <span className="text-ui-md font-semibold text-ink-50">Library</span>
            <span className="text-ui-xs font-mono tabular-nums text-ink-500 ml-1">{library.labels.length} labels</span>
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-100"><X size={15} /></button>
        </div>
        {/* Row 2: search + actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 h-8 px-2 rounded-md bg-ink-800 border border-white/5 flex-1 min-w-0">
            <Search size={13} className="text-ink-400 shrink-0" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search labels..."
              className="bg-transparent text-ui-sm text-ink-100 placeholder-ink-500 outline-none flex-1 min-w-0"
            />
          </div>
          <button
            onClick={handleImport}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-ink-800 border border-white/5 text-ink-300 hover:text-ink-100 text-ui-sm shrink-0"
            title="Import JSON"
          >
            <Upload size={13} />
            <span className="hidden md:inline">Import</span>
          </button>
          {library.labels.length > 0 && (
            <button
              onClick={() => downloadLibraryAsZip(library.labels)}
              className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-ink-800 border border-white/5 text-ink-300 hover:text-ink-100 text-ui-sm shrink-0"
              title="Export all labels as ZIP"
            >
              <Download size={13} />
              <span className="hidden md:inline">Export all</span>
            </button>
          )}
          <button
            onClick={() => {
              const dirty = useEditorV2Store.getState().currentLabelDirty;
              const hasId = useEditorV2Store.getState().currentLabelId;
              if (dirty || !hasId) {
                const ok = confirm("You have unsaved changes. Discard and create a new label?");
                if (!ok) return;
              }
              newLabel();
              onClose();
            }}
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-accent/10 border border-accent/30 text-accent hover:bg-accent/15 text-ui-sm font-semibold shrink-0"
          >
            <Plus size={13} />
            <span className="hidden md:inline">New label</span>
          </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-3">
        {filtered.length === 0 ? (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-full bg-ink-800 border border-white/5 flex items-center justify-center mb-3">
              <Folder size={18} className="text-ink-400" />
            </div>
            <div className="text-ui-md font-semibold text-ink-100">
              {query ? "No matches" : "No saved labels"}
            </div>
            <div className="text-ui-sm text-ink-400 mt-0.5">
              {query
                ? "Try a different search"
                : 'Click "New label" to create your first label'}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filtered.map((item) => {
              const isCurrent = item.id === currentLabelId;
              return (
                <div
                  key={item.id}
                  className={`group relative text-left rounded-lg border ${
                    isCurrent
                      ? "border-accent/50 bg-accent/[0.04]"
                      : "border-white/5 bg-ink-800 hover:border-white/15"
                  } overflow-hidden hover-fade`}
                >
                  <button
                    onClick={() => {
                      const s = useEditorV2Store.getState();
                      if (s.currentLabelDirty || !s.currentLabelId) {
                        if (!confirm("You have unsaved changes. Discard and open this label?")) return;
                      }
                      openLabel(item.id);
                      onClose();
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenu({ id: item.id, x: e.clientX, y: e.clientY });
                    }}
                    className="block w-full text-left"
                  >
                    <div className="h-28 bg-gradient-to-br from-ink-900 to-ink-950 p-3 flex items-center justify-center border-b border-white/5 overflow-hidden">
                      <LabelThumbnail doc={item} maxW={180} maxH={80} />
                    </div>
                    <div className="p-2.5">
                      <div className="flex items-center gap-1.5">
                        {isCurrent && (
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                        )}
                        <div className="text-ui-base font-semibold text-ink-50 truncate flex-1">
                          {item.name}
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-ui-xs font-mono text-ink-400">
                        <span className="tabular-nums">
                          {item.label.widthMm}x{item.label.heightMm}mm ·{" "}
                          {item.elements.length} el
                        </span>
                        <span>{relTime(item.updatedAt)}</span>
                      </div>
                    </div>
                  </button>

                  {/* Card actions (visible on hover) */}
                  <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (confirm(`Delete "${item.name}"?`)) deleteLabel(item.id);
                      }}
                      className="w-7 h-7 rounded-md bg-ink-900/80 border border-white/10 text-ink-400 hover:text-red-400 hover:border-red-400/30 flex items-center justify-center"
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </button>
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        const r = e.currentTarget.getBoundingClientRect();
                        setMenu({ id: item.id, x: r.right, y: r.bottom });
                      }}
                      className="w-7 h-7 rounded-md bg-ink-900/80 border border-white/10 text-ink-300 hover:text-ink-50 flex items-center justify-center"
                      title="More options"
                    >
                      <MoreHorizontal size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Context menu — portaled to body so it escapes overflow clipping */}
      {menu && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[80] w-44 bg-ink-850 border border-white/10 rounded-md shadow-panel py-1 text-ui-sm"
          style={{ left: menu.x, top: menu.y }}
        >
          <button
            onClick={() => {
              openLabel(menu.id);
              setMenu(null);
              onClose();
            }}
            className="w-full text-left px-3 h-8 flex items-center gap-2 text-ink-200 hover:bg-ink-800"
          >
            Open
          </button>
          <button
            onClick={() => {
              duplicateLabel(menu.id);
              setMenu(null);
            }}
            className="w-full text-left px-3 h-8 flex items-center gap-2 text-ink-200 hover:bg-ink-800"
          >
            <Copy size={13} className="text-ink-400" />
            Duplicate
          </button>
          <button
            onClick={() => {
              const lbl = library.labels.find((l) => l.id === menu.id);
              if (lbl) downloadLabelAsJson(lbl);
              setMenu(null);
            }}
            className="w-full text-left px-3 h-8 flex items-center gap-2 text-ink-200 hover:bg-ink-800"
          >
            <Download size={13} className="text-ink-400" />
            Download JSON
          </button>
          <div className="my-1 border-t border-white/5" />
          <button
            onClick={() => {
              const lbl = library.labels.find((l) => l.id === menu.id);
              if (confirm(`Delete "${lbl?.name || "this label"}"?`)) {
                deleteLabel(menu.id);
              }
              setMenu(null);
            }}
            className="w-full text-left px-3 h-8 flex items-center gap-2 text-red-400 hover:bg-ink-800"
          >
            <Trash2 size={13} />
            Delete label
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

import {
  Undo2,
  Redo2,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Grid3x3,
  Ruler,
  Heart,
} from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { PrintButton } from "./print-button.tsx";
import { PrinterChip } from "./printer-chip.tsx";
import { FileChip } from "./file-chip.tsx";
import { ThemePicker } from "./theme-picker.tsx";
import logoSvg from "../../assets/logo.svg";

interface TopChromeProps {
  onPrint: (copies: number) => Promise<boolean>;
}

export function TopChrome({ onPrint }: TopChromeProps) {
  const zoom = useEditorV2Store((s) => s.zoom);
  const label = useEditorV2Store((s) => s.label);
  const gridVisible = useEditorV2Store((s) => s.gridVisible);
  const rulersVisible = useEditorV2Store((s) => s.rulersVisible);
  const setZoom = useEditorV2Store((s) => s.setZoom);
  const setPan = useEditorV2Store((s) => s.setPan);

  const viewBtn = (active: boolean) =>
    `w-8 h-8 flex items-center justify-center rounded-md border hover-fade ${
      active
        ? "bg-accent/10 text-accent border-accent/30"
        : "bg-ink-800 text-ink-300 border-white/5 hover:text-ink-100"
    }`;

  const handleFit = () => {
    const cw = window.innerWidth - 160;
    const ch = window.innerHeight - 200;
    const fit = Math.max(
      0.5,
      Math.min(4, Math.min(cw / label.widthPx, ch / label.heightPx)),
    );
    setZoom(fit);
    setPan(0, 0);
  };

  return (
    <div className="bg-ink-900/95 border-b border-white/5 backdrop-blur-sm z-20 relative shrink-0">
      {/* Desktop: single row */}
      <div className="hidden md:flex h-16 items-center gap-3 px-4">
        <div className="flex items-center gap-2 pr-3 border-r border-white/5 h-8">
          <img src={logoSvg} alt="Thermoprint" className="w-7 h-7 shrink-0" />
          <FileChip />
        </div>
        <PrinterChip />
        <div className="w-px h-6 bg-white/5" />
        <div className="flex items-center gap-0.5">
          <button onClick={() => useEditorV2Store.temporal.getState().undo()} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-300 hover:bg-ink-800 hover:text-ink-100" title="Undo (⌘Z)"><Undo2 size={16} /></button>
          <button onClick={() => useEditorV2Store.temporal.getState().redo()} className="w-8 h-8 flex items-center justify-center rounded-md text-ink-300 hover:bg-ink-800 hover:text-ink-100" title="Redo (⌘⇧Z)"><Redo2 size={16} /></button>
        </div>
        <button onClick={() => useEditorV2Store.setState({ paletteOpen: true })} className="flex-1 min-w-0 flex items-center gap-2 h-8 px-2.5 rounded-md bg-ink-800 border border-white/5 text-ink-400 hover:text-ink-100 hover:bg-ink-750 hover-fade">
          <Search size={14} className="shrink-0" />
          <span className="text-ui-sm flex-1 text-left truncate">Search commands, templates, elements…</span>
          <kbd>⌘K</kbd>
        </button>
        <div className="flex items-center h-8 rounded-md bg-ink-800 border border-white/5 overflow-hidden">
          <button onClick={() => setZoom(zoom - 0.2)} className="w-7 h-full flex items-center justify-center text-ink-300 hover:bg-ink-700"><ZoomOut size={15} /></button>
          <div className="px-2 font-mono text-ui-sm text-ink-200 tabular-nums w-[52px] text-center">{Math.round(zoom * 100)}%</div>
          <button onClick={() => setZoom(zoom + 0.2)} className="w-7 h-full flex items-center justify-center text-ink-300 hover:bg-ink-700"><ZoomIn size={15} /></button>
          <div className="w-px h-4 bg-white/5" />
          <button onClick={handleFit} className="w-7 h-full flex items-center justify-center text-ink-300 hover:bg-ink-700" title="Fit to screen (1)"><Maximize2 size={15} /></button>
        </div>
        <div className="w-px h-6 bg-white/5" />
        <div className="flex items-center gap-1">
          <button className={viewBtn(gridVisible)} title="Grid (G)" onClick={() => useEditorV2Store.setState((s) => ({ gridVisible: !s.gridVisible }))}><Grid3x3 size={15} /></button>
          <button className={viewBtn(rulersVisible)} title="Rulers" onClick={() => useEditorV2Store.setState((s) => ({ rulersVisible: !s.rulersVisible }))}><Ruler size={15} /></button>
          <ThemePicker />
        </div>
        <a href="https://github.com/sponsors/tomLadder" target="_blank" rel="noopener noreferrer" className="w-8 h-8 flex items-center justify-center rounded-md text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 hover-fade" title="Sponsor this project">
          <Heart size={16} />
        </a>
        <PrintButton onPrint={onPrint} />
      </div>

      {/* Mobile: two rows */}
      <div className="md:hidden">
        {/* Row 1: logo, file, spacer, bluetooth, print */}
        <div className="flex items-center gap-1.5 h-11 px-2">
          <img src={logoSvg} alt="Thermoprint" className="w-6 h-6 shrink-0" />
          <FileChip />
          <div className="flex-1" />
          <PrinterChip />
          <PrintButton onPrint={onPrint} />
        </div>
        {/* Row 2: undo, redo, zoom, search, grid, theme */}
        <div className="flex items-center gap-1 h-9 px-2 border-t border-white/5">
          <button onClick={() => useEditorV2Store.temporal.getState().undo()} className="w-7 h-7 flex items-center justify-center rounded-md text-ink-300 hover:bg-ink-800 hover:text-ink-100" title="Undo"><Undo2 size={14} /></button>
          <button onClick={() => useEditorV2Store.temporal.getState().redo()} className="w-7 h-7 flex items-center justify-center rounded-md text-ink-300 hover:bg-ink-800 hover:text-ink-100" title="Redo"><Redo2 size={14} /></button>
          <div className="w-px h-5 bg-white/5" />
          <div className="flex items-center h-7 rounded-md bg-ink-800 border border-white/5 overflow-hidden">
            <button onClick={() => setZoom(zoom - 0.2)} className="w-6 h-full flex items-center justify-center text-ink-300 hover:bg-ink-700"><ZoomOut size={12} /></button>
            <div className="px-1 font-mono text-ui-2xs text-ink-200 tabular-nums text-center">{Math.round(zoom * 100)}%</div>
            <button onClick={() => setZoom(zoom + 0.2)} className="w-6 h-full flex items-center justify-center text-ink-300 hover:bg-ink-700"><ZoomIn size={12} /></button>
            <div className="w-px h-4 bg-white/5" />
            <button onClick={handleFit} className="w-6 h-full flex items-center justify-center text-ink-300 hover:bg-ink-700" title="Fit"><Maximize2 size={12} /></button>
          </div>
          <div className="w-px h-5 bg-white/5" />
          <button onClick={() => useEditorV2Store.setState({ paletteOpen: true })} className="flex-1 min-w-0 flex items-center gap-1.5 h-7 px-2 rounded-md bg-ink-800 border border-white/5 text-ink-400 hover:text-ink-100 hover-fade">
            <Search size={12} className="shrink-0" />
            <span className="text-ui-xs flex-1 text-left truncate">Search…</span>
          </button>
          <div className="w-px h-5 bg-white/5" />
          <button
            className={`w-7 h-7 flex items-center justify-center rounded-md border hover-fade ${gridVisible ? "bg-accent/10 text-accent border-accent/30" : "bg-ink-800 text-ink-300 border-white/5"}`}
            title="Grid"
            onClick={() => useEditorV2Store.setState((s) => ({ gridVisible: !s.gridVisible }))}
          >
            <Grid3x3 size={14} />
          </button>
          <ThemePicker />
          <a href="https://github.com/sponsors/tomLadder" target="_blank" rel="noopener noreferrer" className="w-7 h-7 flex items-center justify-center rounded-md text-pink-400 hover:bg-pink-500/10 hover:text-pink-300 hover-fade" title="Sponsor">
            <Heart size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}

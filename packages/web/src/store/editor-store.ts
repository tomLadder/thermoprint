import { create } from "zustand";
import { temporal } from "zundo";
import { mmToPx } from "../utils/px-mm.ts";
import {
  type Library,
  type SavedLabel,
  loadLibrary,
  persistLibrary,
} from "../lib/library.ts";

// ---- Element types ----

export type ElementType =
  | "text"
  | "qrcode"
  | "barcode"
  | "rect"
  | "line"
  | "image";

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  props: Record<string, unknown>;
}

export interface LabelSize {
  widthMm: number;
  heightMm: number;
  widthPx: number;
  heightPx: number;
}

// ---- State shape ----

export interface EditorState {
  // Document
  label: LabelSize;
  paperType: "gap" | "continuous";
  elements: BaseElement[];

  // View
  zoom: number;
  panX: number;
  panY: number;
  gridVisible: boolean;
  rulersVisible: boolean;
  rollDirection: "horizontal" | "vertical";
  uiScale: number;
  theme: "cyan" | "amber" | "graphite" | "violet" | "forest" | "paper";
  mode: "dark" | "light";

  // Selection
  selectedIds: string[];
  hoveredId: string | null;
  activeTool: "select" | ElementType;

  // Hardware
  printer: {
    connected: boolean;
    name: string;
    battery: number;
    model: string;
  };
  connectFlow: {
    open: boolean;
    step: "idle" | "scanning" | "pairing" | "connected" | "error";
    devices: unknown[];
    selectedId: string | null;
  };
  printSettings: {
    density: number;
    ditherMode: string;
    threshold: number;
  };

  // Library
  library: Library;
  currentLabelId: string | null;
  currentLabelName: string;
  currentLabelDirty: boolean;

  // Transient UI
  printing: boolean;
  printingCopies: number;
  printingStartedAt: number;
  printingDuration: number;
  printProgress: { bytesSent: number; totalBytes: number } | null;
  paletteOpen: boolean;
  printFlyoutOpen: boolean;
  editingTextId: string | null;

  // Actions — library
  saveLabel: () => void;
  saveLabelAs: (name: string) => void;
  openLabel: (id: string) => void;
  deleteLabel: (id: string) => void;
  duplicateLabel: (id: string) => void;
  renameCurrent: (name: string) => void;
  importLabel: (data: Omit<SavedLabel, "id">) => void;
  newLabel: () => void;

  // Actions — document
  addElement: (el: BaseElement) => void;
  updateElement: (id: string, patch: Partial<BaseElement>) => void;
  updateElementLive: (id: string, patch: Partial<BaseElement>) => void;
  removeSelected: () => void;
  duplicateSelected: () => void;
  zOrder: (id: string, dir: "up" | "down" | "top" | "bottom") => void;

  // Actions — selection
  selectOnly: (ids: string[]) => void;
  selectToggle: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;

  // Actions — view
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  setUiScale: (scale: number) => void;
  setTheme: (theme: string) => void;
  setMode: (mode: string) => void;

  // Actions — print
  startPrint: (copies: number, duration: number) => void;
  endPrint: () => void;
}

// ---- Helpers ----

function uid(): string {
  return crypto.randomUUID();
}

// ---- Default values ----

const DEFAULT_LABEL: LabelSize = {
  widthMm: 40,
  heightMm: 12,
  widthPx: mmToPx(40),
  heightPx: mmToPx(12),
};

// ---- Store ----

export const useEditorV2Store = create<EditorState>()(
  temporal(
    (set, get) => ({
      // Document
      label: DEFAULT_LABEL,
      paperType: "gap",
      elements: [],

      // View
      zoom: 2.2,
      panX: 0,
      panY: 0,
      gridVisible: true,
      rulersVisible: true,
      rollDirection: "horizontal",
      uiScale: (() => {
        try {
          const v = parseFloat(localStorage.getItem("tp.uiScale.v1") || "1");
          return isFinite(v) ? Math.max(0.8, Math.min(1.4, v)) : 1;
        } catch { return 1; }
      })(),
      theme: (() => {
        try {
          const t = localStorage.getItem("tp.theme.v1") || "cyan";
          const valid = ["cyan", "amber", "graphite", "violet", "forest", "paper"] as const;
          return (valid as readonly string[]).includes(t) ? t as typeof valid[number] : "cyan";
        } catch { return "cyan" as const; }
      })(),
      mode: (() => {
        try {
          const m = localStorage.getItem("tp.mode.v1") || "dark";
          return m === "light" ? "light" as const : "dark" as const;
        } catch { return "dark" as const; }
      })(),

      // Selection
      selectedIds: [],
      hoveredId: null,
      activeTool: "select",

      // Hardware
      printer: {
        connected: false,
        name: "",
        battery: 0,
        model: "",
      },
      connectFlow: {
        open: false,
        step: "idle",
        devices: [],
        selectedId: null,
      },
      printSettings: {
        density: 2,
        ditherMode: "floyd-steinberg",
        threshold: 128,
      },

      // Library
      library: (loadLibrary() ?? { labels: [], recent: [], currentLabelId: null }),
      currentLabelId: null,
      currentLabelName: "Untitled",
      currentLabelDirty: false,

      // Transient UI
      printing: false,
      printingCopies: 1,
      printingStartedAt: 0,
      printingDuration: 0,
      printProgress: null,
      paletteOpen: false,
      printFlyoutOpen: false,
      editingTextId: null,

      // ---- Actions — library ----

      saveLabel: () => {
        const s = get();
        const { library, currentLabelId, elements, label, currentLabelName } = s;
        if (!currentLabelId) {
          get().saveLabelAs(currentLabelName || "Untitled");
          return;
        }
        const idx = library.labels.findIndex((l) => l.id === currentLabelId);
        if (idx < 0) {
          get().saveLabelAs(currentLabelName || "Untitled");
          return;
        }
        const updated: SavedLabel = {
          ...library.labels[idx],
          label: { ...label },
          elements: structuredClone(elements),
          updatedAt: Date.now(),
        };
        const nextLib: Library = {
          ...library,
          labels: library.labels.map((l, i) => (i === idx ? updated : l)),
          recent: [currentLabelId, ...library.recent.filter((x) => x !== currentLabelId)].slice(0, 8),
        };
        set({ library: nextLib, currentLabelDirty: false });
        persistLibrary(nextLib);
      },

      saveLabelAs: (name) => {
        const { library, elements, label } = get();
        const nl: SavedLabel = {
          id: uid(),
          name: name || "Untitled",
          label: { ...label },
          elements: structuredClone(elements),
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const nextLib: Library = {
          ...library,
          labels: [nl, ...library.labels],
          recent: [nl.id, ...library.recent].slice(0, 8),
          currentLabelId: nl.id,
        };
        set({
          library: nextLib,
          currentLabelId: nl.id,
          currentLabelName: nl.name,
          currentLabelDirty: false,
        });
        persistLibrary(nextLib);
      },

      openLabel: (id) => {
        const { library } = get();
        const lbl = library.labels.find((l) => l.id === id);
        if (!lbl) return;
        const recent = [id, ...library.recent.filter((x) => x !== id)].slice(0, 8);
        const nextLib: Library = { ...library, recent, currentLabelId: id };
        set({
          library: nextLib,
          currentLabelId: id,
          currentLabelName: lbl.name,
          currentLabelDirty: false,
          elements: structuredClone(lbl.elements),
          label: { ...lbl.label },
          selectedIds: [],
        });
        persistLibrary(nextLib);
      },

      deleteLabel: (id) => {
        const { library, currentLabelId } = get();
        const nextLabels = library.labels.filter((l) => l.id !== id);
        const nextRecent = library.recent.filter((x) => x !== id);
        const nextLib: Library = {
          ...library,
          labels: nextLabels,
          recent: nextRecent,
          currentLabelId: currentLabelId === id ? null : library.currentLabelId,
        };
        if (currentLabelId === id) {
          const next = nextLabels[0];
          if (next) {
            nextLib.currentLabelId = next.id;
            set({
              library: nextLib,
              currentLabelId: next.id,
              currentLabelName: next.name,
              currentLabelDirty: false,
              elements: structuredClone(next.elements),
              label: { ...next.label },
              selectedIds: [],
            });
          } else {
            set({
              library: nextLib,
              currentLabelId: null,
              currentLabelName: "Untitled",
              currentLabelDirty: false,
              elements: [],
              label: DEFAULT_LABEL,
              selectedIds: [],
            });
          }
        } else {
          set({ library: nextLib });
        }
        persistLibrary(nextLib);
      },

      duplicateLabel: (id) => {
        const { library } = get();
        const src = library.labels.find((l) => l.id === id);
        if (!src) return;
        const copy: SavedLabel = {
          ...structuredClone(src),
          id: uid(),
          name: `${src.name} copy`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const nextLib: Library = { ...library, labels: [copy, ...library.labels] };
        set({ library: nextLib });
        persistLibrary(nextLib);
      },

      renameCurrent: (name) => {
        const { library, currentLabelId } = get();
        if (!currentLabelId) {
          set({ currentLabelName: name });
          return;
        }
        const nextLib: Library = {
          ...library,
          labels: library.labels.map((l) =>
            l.id === currentLabelId ? { ...l, name } : l,
          ),
        };
        set({ library: nextLib, currentLabelName: name });
        persistLibrary(nextLib);
      },

      importLabel: (data) => {
        const { library } = get();
        const nl: SavedLabel = { ...data, id: uid() };
        const nextLib: Library = {
          ...library,
          labels: [nl, ...library.labels],
        };
        set({ library: nextLib });
        persistLibrary(nextLib);
      },

      newLabel: () => {
        set({
          currentLabelId: null,
          currentLabelName: "Untitled",
          currentLabelDirty: false,
          elements: [],
          label: DEFAULT_LABEL,
          selectedIds: [],
          editingTextId: null,
        });
      },

      // ---- Actions — document ----

      addElement: (el) =>
        set((s) => ({
          elements: [...s.elements, el],
          selectedIds: [el.id],
          activeTool: "select",
          currentLabelDirty: true,
        })),

      updateElement: (id, patch) =>
        set((s) => ({
          elements: s.elements.map((e) =>
            e.id === id
              ? {
                  ...e,
                  ...patch,
                  props: patch.props ? { ...e.props, ...patch.props } : e.props,
                }
              : e,
          ),
          currentLabelDirty: true,
        })),

      updateElementLive: (id, patch) =>
        set((s) => ({
          elements: s.elements.map((e) =>
            e.id === id ? { ...e, ...patch } : e,
          ),
        })),

      removeSelected: () => {
        const { selectedIds } = get();
        if (!selectedIds.length) return;
        set((s) => ({
          elements: s.elements.filter((e) => !s.selectedIds.includes(e.id)),
          selectedIds: [],
          currentLabelDirty: true,
        }));
      },

      duplicateSelected: () => {
        const { elements, selectedIds } = get();
        if (!selectedIds.length) return;
        const dups = elements
          .filter((e) => selectedIds.includes(e.id))
          .map((e) => ({
            ...e,
            id: uid(),
            x: e.x + 16,
            y: e.y + 16,
            props: { ...e.props },
          }));
        set((s) => ({
          elements: [...s.elements, ...dups],
          selectedIds: dups.map((d) => d.id),
          currentLabelDirty: true,
        }));
      },

      zOrder: (id, dir) =>
        set((s) => {
          const idx = s.elements.findIndex((e) => e.id === id);
          if (idx < 0) return s;
          const arr = [...s.elements];
          const [item] = arr.splice(idx, 1);
          if (dir === "top") arr.push(item);
          else if (dir === "bottom") arr.unshift(item);
          else if (dir === "up")
            arr.splice(Math.min(arr.length, idx + 1), 0, item);
          else if (dir === "down") arr.splice(Math.max(0, idx - 1), 0, item);
          return { elements: arr, currentLabelDirty: true };
        }),

      selectOnly: (ids) => set({ selectedIds: ids }),

      selectToggle: (id) =>
        set((s) => ({
          selectedIds: s.selectedIds.includes(id)
            ? s.selectedIds.filter((x) => x !== id)
            : [...s.selectedIds, id],
        })),

      selectAll: () =>
        set((s) => ({ selectedIds: s.elements.map((e) => e.id) })),

      clearSelection: () => set({ selectedIds: [] }),

      setZoom: (zoom) =>
        set({ zoom: Math.max(0.25, Math.min(8, zoom)) }),

      setPan: (x, y) => set({ panX: x, panY: y }),

      setUiScale: (v) => {
        const n = Math.max(0.8, Math.min(1.4, Number(v) || 1));
        document.documentElement.style.setProperty("--ui-scale", String(n));
        try { localStorage.setItem("tp.uiScale.v1", String(n)); } catch {}
        set({ uiScale: n });
      },

      setTheme: (t) => {
        const valid = ["cyan", "amber", "graphite", "violet", "forest", "paper"] as const;
        const n = (valid as readonly string[]).includes(t) ? t as typeof valid[number] : "cyan";
        document.documentElement.setAttribute("data-theme", n);
        try { localStorage.setItem("tp.theme.v1", n); } catch {}
        set({ theme: n });
      },

      setMode: (m) => {
        const n = m === "light" ? "light" as const : "dark" as const;
        document.documentElement.setAttribute("data-mode", n);
        if (n === "dark") document.documentElement.classList.add("dark");
        else document.documentElement.classList.remove("dark");
        try { localStorage.setItem("tp.mode.v1", n); } catch {}
        set({ mode: n });
      },

      startPrint: (copies, duration) =>
        set({
          printing: true,
          printingCopies: copies,
          printingStartedAt: Date.now(),
          printingDuration: duration,
          printProgress: null,
        }),

      endPrint: () => set({ printing: false, printProgress: null }),
    }),
    {
      // Only track document state for undo/redo, not view/selection/UI
      partialize: (s) => ({
        elements: s.elements,
        label: s.label,
      }),
      limit: 50,
    },
  ),
);

// Legacy aliases — old components import these names
export const useEditorStore = useEditorV2Store;
export type { BaseElement as EditorElement, LabelSize as LabelConfig };

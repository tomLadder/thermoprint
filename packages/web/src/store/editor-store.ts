import { create } from "zustand";
import type { EditorElement, LabelConfig } from "./types.ts";
import { mmToPx } from "../utils/px-mm.ts";

interface HistoryEntry {
  elements: EditorElement[];
}

interface EditorState {
  elements: EditorElement[];
  selectedId: string | null;
  labelConfig: LabelConfig;

  past: HistoryEntry[];
  future: HistoryEntry[];

  addElement: (element: EditorElement) => void;
  updateElement: (id: string, patch: Partial<EditorElement>) => void;
  updateElementProps: (id: string, props: Partial<EditorElement["props"]>) => void;
  removeElement: (id: string) => void;
  setSelectedId: (id: string | null) => void;
  setLabelConfig: (widthMm: number, heightMm: number) => void;
  moveElement: (id: string, direction: "up" | "down" | "top" | "bottom") => void;

  undo: () => void;
  redo: () => void;
  pushHistory: () => void;

  setElements: (elements: EditorElement[]) => void;
  clearAll: () => void;
}

const DEFAULT_LABEL: LabelConfig = {
  widthMm: 40,
  heightMm: 12,
  widthPx: mmToPx(40),
  heightPx: mmToPx(12),
};

export const useEditorStore = create<EditorState>((set, get) => ({
  elements: [],
  selectedId: null,
  labelConfig: DEFAULT_LABEL,
  past: [],
  future: [],

  addElement: (element) => {
    get().pushHistory();
    set((s) => ({ elements: [...s.elements, element] }));
  },

  updateElement: (id, patch) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, ...patch } : el,
      ),
    }));
  },

  updateElementProps: (id, props) => {
    set((s) => ({
      elements: s.elements.map((el) =>
        el.id === id ? { ...el, props: { ...el.props, ...props } } : el,
      ),
    }));
  },

  removeElement: (id) => {
    get().pushHistory();
    set((s) => ({
      elements: s.elements.filter((el) => el.id !== id),
      selectedId: s.selectedId === id ? null : s.selectedId,
    }));
  },

  setSelectedId: (id) => set({ selectedId: id }),

  setLabelConfig: (widthMm, heightMm) =>
    set({
      labelConfig: {
        widthMm,
        heightMm,
        widthPx: mmToPx(widthMm),
        heightPx: mmToPx(heightMm),
      },
    }),

  moveElement: (id, direction) => {
    get().pushHistory();
    set((s) => {
      const idx = s.elements.findIndex((el) => el.id === id);
      if (idx === -1) return s;
      const elements = [...s.elements];
      const [el] = elements.splice(idx, 1);
      switch (direction) {
        case "up":
          elements.splice(Math.min(idx + 1, elements.length), 0, el);
          break;
        case "down":
          elements.splice(Math.max(idx - 1, 0), 0, el);
          break;
        case "top":
          elements.push(el);
          break;
        case "bottom":
          elements.unshift(el);
          break;
      }
      return { elements };
    });
  },

  pushHistory: () => {
    set((s) => ({
      past: [...s.past.slice(-49), { elements: structuredClone(s.elements) }],
      future: [],
    }));
  },

  undo: () => {
    const { past, elements } = get();
    if (past.length === 0) return;
    const prev = past[past.length - 1];
    set({
      past: past.slice(0, -1),
      future: [{ elements: structuredClone(elements) }, ...get().future],
      elements: prev.elements,
      selectedId: null,
    });
  },

  redo: () => {
    const { future, elements } = get();
    if (future.length === 0) return;
    const next = future[0];
    set({
      future: future.slice(1),
      past: [...get().past, { elements: structuredClone(elements) }],
      elements: next.elements,
      selectedId: null,
    });
  },

  setElements: (elements) => set({ elements, selectedId: null }),

  clearAll: () => {
    get().pushHistory();
    set({ elements: [], selectedId: null });
  },
}));

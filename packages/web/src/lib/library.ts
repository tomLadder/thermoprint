import type { BaseElement, LabelSize } from "../store/editor-store.ts";

// ---- Types ----

export interface SavedLabel {
  id: string;
  name: string;
  label: LabelSize;
  elements: BaseElement[];
  createdAt: number;
  updatedAt: number;
}

export interface Library {
  labels: SavedLabel[];
  recent: string[]; // label ids, most-recent-first
  currentLabelId: string | null;
}

// ---- LocalStorage persistence ----

const LS_KEY = "thermoprint.library.v1";

export function loadLibrary(): Library | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    // Migrate old schema if needed
    if (parsed.projects && !parsed.labels) {
      parsed.labels = parsed.projects;
      delete parsed.projects;
    }
    return parsed as Library;
  } catch {
    return null;
  }
}

let _saveTimer: ReturnType<typeof setTimeout> | null = null;

export function persistLibrary(lib: Library): void {
  if (_saveTimer) clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(lib));
    } catch (e) {
      console.warn("[thermoprint] library save failed:", e);
    }
    _saveTimer = null;
  }, 300);
}

// ---- JSON export ----

export function downloadLabelAsJson(label: SavedLabel): void {
  const data = {
    name: label.name,
    label: label.label,
    elements: label.elements,
    createdAt: label.createdAt,
    updatedAt: label.updatedAt,
  };
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${label.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importLabelFromJson(file: File): Promise<Omit<SavedLabel, "id">> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result as string);
        if (!data.label || !Array.isArray(data.elements)) {
          reject(new Error("Invalid label file"));
          return;
        }
        resolve({
          name: data.name || file.name.replace(/\.json$/, ""),
          label: data.label,
          elements: data.elements,
          createdAt: data.createdAt || Date.now(),
          updatedAt: Date.now(),
        });
      } catch {
        reject(new Error("Failed to parse JSON"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}

import { useCallback, useState, useEffect } from "react";
import type { EditorElement, LabelConfig } from "../store/types.ts";
import { useEditorStore } from "../store/editor-store.ts";

interface Template {
  id: string;
  name: string;
  elements: EditorElement[];
  labelConfig: LabelConfig;
  createdAt: number;
}

const STORAGE_KEY = "thermoprint-templates";

function loadTemplates(): Template[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveTemplates(templates: Template[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function useTemplates() {
  const [templates, setTemplates] = useState<Template[]>(loadTemplates);

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setTemplates(loadTemplates());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const saveTemplate = useCallback((name: string) => {
    const state = useEditorStore.getState();
    const template: Template = {
      id: crypto.randomUUID(),
      name,
      elements: structuredClone(state.elements),
      labelConfig: { ...state.labelConfig },
      createdAt: Date.now(),
    };
    const updated = [...loadTemplates(), template];
    saveTemplates(updated);
    setTemplates(updated);
    return template;
  }, []);

  const loadTemplate = useCallback((template: Template) => {
    const store = useEditorStore.getState();
    store.pushHistory();
    store.setLabelConfig(template.labelConfig.widthMm, template.labelConfig.heightMm);
    store.setElements(structuredClone(template.elements));
  }, []);

  const deleteTemplate = useCallback((id: string) => {
    const updated = loadTemplates().filter((t) => t.id !== id);
    saveTemplates(updated);
    setTemplates(updated);
  }, []);

  const exportTemplate = useCallback((template: Template) => {
    const json = JSON.stringify(template, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${template.name}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const importTemplate = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const template = JSON.parse(reader.result as string) as Template;
          template.id = crypto.randomUUID();
          const updated = [...loadTemplates(), template];
          saveTemplates(updated);
          setTemplates(updated);
        } catch {
          // Invalid JSON
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }, []);

  return { templates, saveTemplate, loadTemplate, deleteTemplate, exportTemplate, importTemplate };
}

import { useState } from "react";
import { Save, Upload } from "lucide-react";
import { useTemplates } from "../hooks/use-templates.ts";
import { TemplateCard } from "./template-card.tsx";

export function TemplateManager() {
  const { templates, saveTemplate, loadTemplate, deleteTemplate, exportTemplate, importTemplate } = useTemplates();
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    saveTemplate(name.trim());
    setName("");
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider">Templates</h3>
      <div className="flex gap-1">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()} placeholder="Template name"
          className="flex-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
        <button onClick={handleSave} disabled={!name.trim()} title="Save template"
          className="p-1 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30">
          <Save size={14} />
        </button>
      </div>
      <button onClick={importTemplate}
        className="flex items-center justify-center gap-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
        <Upload size={12} /> Import
      </button>
      {templates.length > 0 && (
        <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
          {templates.map((t) => (
            <TemplateCard key={t.id} name={t.name} createdAt={t.createdAt}
              onLoad={() => loadTemplate(t)} onExport={() => exportTemplate(t)} onDelete={() => deleteTemplate(t.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

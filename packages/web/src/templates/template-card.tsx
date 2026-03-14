import { Download, Trash2 } from "lucide-react";

interface TemplateCardProps {
  name: string;
  createdAt: number;
  onLoad: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export function TemplateCard({ name, createdAt, onLoad, onExport, onDelete }: TemplateCardProps) {
  return (
    <div className="flex items-center justify-between p-1.5 rounded border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700">
      <button onClick={onLoad} className="flex-1 text-left text-sm truncate" title={`Load "${name}"`}>
        <div className="font-medium truncate">{name}</div>
        <div className="text-xs text-gray-400">{new Date(createdAt).toLocaleDateString()}</div>
      </button>
      <div className="flex items-center gap-0.5 ml-1">
        <button onClick={onExport} className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" title="Export"><Download size={14} /></button>
        <button onClick={onDelete} className="p-0.5 text-gray-400 hover:text-red-500" title="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}

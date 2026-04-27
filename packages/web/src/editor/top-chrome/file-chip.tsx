import { useState, useEffect, useRef } from "react";
import {
  ChevronDown,
  Save,
  Copy,
  Folder,
  PenLine,
  Download,
  Trash2,
} from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { downloadLabelAsJson } from "../../lib/library.ts";

export function FileChip() {
  const currentLabelName = useEditorV2Store((s) => s.currentLabelName);
  const currentLabelDirty = useEditorV2Store((s) => s.currentLabelDirty || s.currentLabelId === null);
  const currentLabelId = useEditorV2Store((s) => s.currentLabelId);
  const library = useEditorV2Store((s) => s.library);
  const saveLabel = useEditorV2Store((s) => s.saveLabel);
  const saveLabelAs = useEditorV2Store((s) => s.saveLabelAs);
  const renameCurrent = useEditorV2Store((s) => s.renameCurrent);
  const deleteLabel = useEditorV2Store((s) => s.deleteLabel);
  const newLabel = useEditorV2Store((s) => s.newLabel);

  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(currentLabelName);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setName(currentLabelName);
  }, [currentLabelName]);

  // Close menu on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const commitRename = () => {
    const v = name.trim() || "Untitled";
    setRenaming(false);
    renameCurrent(v);
  };

  const handleDownload = () => {
    setOpen(false);
    if (currentLabelId) {
      const lbl = library.labels.find((l) => l.id === currentLabelId);
      if (lbl) {
        downloadLabelAsJson(lbl);
        return;
      }
    }
    // If not saved yet, download the current state
    const s = useEditorV2Store.getState();
    downloadLabelAsJson({
      id: "export",
      name: currentLabelName,
      label: s.label,
      elements: s.elements,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  };

  return (
    <div className="relative flex flex-col leading-tight" ref={ref}>
      <span className="text-ui-xs font-mono uppercase tracking-wider text-ink-400">
        Thermoprint
      </span>
      <button
        onClick={() => {
          if (!renaming) setOpen((o) => !o);
        }}
        className="flex items-center gap-1 text-left hover-fade"
      >
        {renaming ? (
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitRename();
              if (e.key === "Escape") {
                setName(currentLabelName);
                setRenaming(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
            className="text-ui-base text-ink-100 font-medium bg-ink-800 border border-accent/40 rounded px-1 outline-none min-w-[120px]"
          />
        ) : (
          <span className="text-ui-base text-ink-100 font-medium flex items-center gap-1">
            {currentLabelName || "Untitled"}
            {currentLabelDirty && (
              <span
                className="w-1.5 h-1.5 rounded-full bg-amber-400"
                title="Unsaved changes"
              />
            )}
            <ChevronDown size={10} className="text-ink-400" />
          </span>
        )}
      </button>

      {open && !renaming && (
        <div className="absolute left-0 top-10 w-56 bg-ink-850 border border-white/10 rounded-md shadow-panel py-1 text-ui-sm z-[70]">
          <MenuItem
            icon={PenLine}
            onClick={() => {
              setOpen(false);
              setRenaming(true);
            }}
          >
            Rename
          </MenuItem>
          <MenuItem
            icon={Save}
            shortcut="Cmd+S"
            onClick={() => {
              setOpen(false);
              saveLabel();
            }}
          >
            Save
          </MenuItem>
          <MenuItem
            icon={Copy}
            shortcut="Cmd+Shift+S"
            onClick={() => {
              setOpen(false);
              const n = prompt(
                "Save label as:",
                `${currentLabelName} copy`,
              );
              if (n) saveLabelAs(n);
            }}
          >
            Save as...
          </MenuItem>
          <MenuItem
            icon={Download}
            onClick={handleDownload}
          >
            Download JSON
          </MenuItem>
          <div className="my-1 border-t border-white/5" />
          <MenuItem
            icon={Folder}
            onClick={() => {
              setOpen(false);
              window.dispatchEvent(new CustomEvent("thermoprint:open-library"));
            }}
          >
            Open from library...
          </MenuItem>
          {currentLabelId && (
            <>
              <div className="my-1 border-t border-white/5" />
              <MenuItem
                icon={Trash2}
                onClick={() => {
                  setOpen(false);
                  if (confirm(`Delete "${currentLabelName}"?`)) {
                    deleteLabel(currentLabelId);
                  }
                }}
                danger
              >
                Delete label
              </MenuItem>
            </>
          )}
          {!currentLabelId && (
            <>
              <div className="my-1 border-t border-white/5" />
              <MenuItem
                icon={Trash2}
                onClick={() => {
                  setOpen(false);
                  if (confirm("Discard this unsaved label?")) {
                    newLabel();
                  }
                }}
                danger
              >
                Discard label
              </MenuItem>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  children,
  shortcut,
  onClick,
  danger,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  children: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2.5 h-7 flex items-center gap-2 hover:bg-ink-800 ${
        danger ? "text-red-400" : "text-ink-200"
      }`}
    >
      <Icon size={13} className={danger ? "text-red-400" : "text-ink-400"} />
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span className="text-ui-2xs font-mono text-ink-500">{shortcut}</span>
      )}
    </button>
  );
}

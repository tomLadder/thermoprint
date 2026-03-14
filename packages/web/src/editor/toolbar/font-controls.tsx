import { useState, useEffect } from "react";
import type { TextProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";

const FONTS = ["Saira", "JetBrains Mono", "Arial", "Times New Roman"];

interface FontControlsProps {
  elementId: string;
  props: TextProps;
}

export function FontControls({ elementId, props }: FontControlsProps) {
  const updateElementProps = useEditorStore((s) => s.updateElementProps);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const [sizeInput, setSizeInput] = useState(String(props.fontSize));

  useEffect(() => {
    setSizeInput(String(props.fontSize));
  }, [props.fontSize]);

  const update = (patch: Partial<TextProps>) => {
    pushHistory();
    updateElementProps(elementId, patch);
  };

  const handleSizeChange = (val: string) => {
    setSizeInput(val);
    const n = Number(val);
    if (n >= 1 && n <= 200) {
      update({ fontSize: n });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Font</label>
      <select value={props.fontFamily} onChange={(e) => update({ fontFamily: e.target.value })}
        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
        {FONTS.map((f) => <option key={f} value={f}>{f}</option>)}
      </select>

      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Size</label>
      <input type="number" min={0} max={200} value={sizeInput}
        onChange={(e) => handleSizeChange(e.target.value)}
        onBlur={() => { if (!sizeInput || Number(sizeInput) < 1) { setSizeInput(String(props.fontSize)); } }}
        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />

      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Style</label>
      <select value={props.fontStyle} onChange={(e) => update({ fontStyle: e.target.value as TextProps["fontStyle"] })}
        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
        <option value="">Normal</option>
        <option value="bold">Bold</option>
        <option value="italic">Italic</option>
        <option value="bold italic">Bold Italic</option>
      </select>

      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Align</label>
      <select value={props.align} onChange={(e) => update({ align: e.target.value as TextProps["align"] })}
        className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
        <option value="left">Left</option>
        <option value="center">Center</option>
        <option value="right">Right</option>
      </select>
    </div>
  );
}

import { useState } from "react";
import { useEditorStore } from "../store/editor-store.ts";
import { LABEL_SIZES } from "./label-sizes.ts";

export function LabelSizeSelector() {
  const labelConfig = useEditorStore((s) => s.labelConfig);
  const setLabelConfig = useEditorStore((s) => s.setLabelConfig);
  const [custom, setCustom] = useState(false);

  const currentPreset = LABEL_SIZES.find(
    (s) => s.widthMm === labelConfig.widthMm && s.heightMm === labelConfig.heightMm,
  );

  if (custom) {
    return (
      <div className="flex items-center gap-1.5 text-sm">
        <span className="text-gray-500 dark:text-gray-400">Label:</span>
        <input type="number" value={labelConfig.widthMm} min={10} max={100}
          onChange={(e) => setLabelConfig(Number(e.target.value), labelConfig.heightMm)}
          className="w-14 px-1.5 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
        <span className="text-gray-400">x</span>
        <input type="number" value={labelConfig.heightMm} min={5} max={200}
          onChange={(e) => setLabelConfig(labelConfig.widthMm, Number(e.target.value))}
          className="w-14 px-1.5 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
        <span className="text-sm text-gray-400">mm</span>
        <button onClick={() => setCustom(false)} className="text-sm text-blue-500 hover:text-blue-600 ml-1">Presets</button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-gray-500 dark:text-gray-400">Label:</span>
      <select
        value={currentPreset ? `${currentPreset.widthMm}x${currentPreset.heightMm}` : "custom"}
        onChange={(e) => {
          if (e.target.value === "custom") { setCustom(true); return; }
          const [w, h] = e.target.value.split("x").map(Number);
          setLabelConfig(w, h);
        }}
        className="px-2 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
        {LABEL_SIZES.map((s) => <option key={s.name} value={`${s.widthMm}x${s.heightMm}`}>{s.name}</option>)}
        <option value="custom">Custom...</option>
      </select>
    </div>
  );
}

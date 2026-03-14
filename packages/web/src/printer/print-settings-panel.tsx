import { usePrinterStore } from "../store/printer-store.ts";
import { Tooltip } from "../components/tooltip.tsx";
import { Info } from "lucide-react";
import type { DitherMode } from "@thermoprint/core";

function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip label={text} maxWidth={300}>
      <Info size={14} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help inline-block ml-1" />
    </Tooltip>
  );
}

export function PrintSettingsPanel() {
  const settings = usePrinterStore((s) => s.settings);
  const updateSettings = usePrinterStore((s) => s.updateSettings);

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider">Print Settings</h3>
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Density
          <InfoTip text="Controls how dark the print is. Higher = more heat = darker output." />
        </label>
        <select value={settings.density} onChange={(e) => updateSettings({ density: Number(e.target.value) as 1 | 2 | 3 })}
          className="w-full mt-0.5 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
          <option value={1}>Light</option>
          <option value={2}>Normal</option>
          <option value={3}>Dark</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Paper Type
          <InfoTip text="Gap: die-cut labels with gaps between them. Continuous: uncut paper roll." />
        </label>
        <select value={settings.paperType} onChange={(e) => updateSettings({ paperType: e.target.value as "gap" | "continuous" })}
          className="w-full mt-0.5 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
          <option value="gap">Gap (die-cut)</option>
          <option value="continuous">Continuous</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Dither Mode
          <InfoTip text="How grayscale pixels become black/white. Floyd-Steinberg gives smooth gradients, Threshold is sharper." />
        </label>
        <select value={settings.ditherMode} onChange={(e) => updateSettings({ ditherMode: e.target.value as DitherMode })}
          className="w-full mt-0.5 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
          <option value="floyd-steinberg">Floyd-Steinberg</option>
          <option value="threshold">Threshold</option>
          <option value="none">None</option>
        </select>
      </div>
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Threshold ({settings.threshold})
          <InfoTip text="Brightness cutoff (0–255). Pixels darker than this become black. Lower = more black." />
        </label>
        <input type="range" min={0} max={255} value={settings.threshold}
          onChange={(e) => updateSettings({ threshold: Number(e.target.value) })} className="w-full mt-0.5" />
      </div>
    </div>
  );
}

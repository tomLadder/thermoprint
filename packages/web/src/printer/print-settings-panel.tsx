import { useState } from "react";
import { usePrinterStore, applyModelDefaults } from "../store/printer-store.ts";
import { useEditorStore } from "../store/editor-store.ts";
import { getDevice, getRegisteredDevices } from "@thermoprint/core";
import { getLabelSizes } from "../label/label-sizes.ts";
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

const selectClass =
  "w-full mt-0.5 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700";

export function PrintSettingsPanel() {
  const settings = usePrinterStore((s) => s.settings);
  const updateSettings = usePrinterStore((s) => s.updateSettings);
  const modelId = usePrinterStore((s) => s.modelId);
  const autoDetectedModelId = usePrinterStore((s) => s.autoDetectedModelId);
  const setModelId = usePrinterStore((s) => s.setModelId);

  const labelConfig = useEditorStore((s) => s.labelConfig);
  const setLabelConfig = useEditorStore((s) => s.setLabelConfig);

  const [customSize, setCustomSize] = useState(false);

  const devices = getRegisteredDevices();
  const profile = modelId ? getDevice(modelId) : null;
  const lc = profile?.labelConfig;

  const supportedPaperTypes = lc?.supportedPaperTypes ?? ["gap", "continuous"];
  const sizes = getLabelSizes(modelId, settings.paperType);

  const currentPreset = sizes.find(
    (s) => s.widthMm === labelConfig.widthMm && s.heightMm === labelConfig.heightMm,
  );

  const handleModelChange = (newModelId: string) => {
    setModelId(newModelId);
    applyModelDefaults(newModelId);
    setCustomSize(false);
  };

  const handlePaperTypeChange = (paperType: "gap" | "continuous") => {
    updateSettings({ paperType });
    // Reset label size if current size isn't available for the new paper type
    const newSizes = getLabelSizes(modelId, paperType);
    const stillValid = newSizes.some(
      (s) => s.widthMm === labelConfig.widthMm && s.heightMm === labelConfig.heightMm,
    );
    if (!stillValid && newSizes.length > 0) {
      setLabelConfig(newSizes[0].widthMm, newSizes[0].heightMm);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider">Print Settings</h3>

      {/* Printer Model */}
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Printer Model
          <InfoTip text="Select your printer model to filter available label sizes and paper types." />
        </label>
        <select
          value={modelId ?? ""}
          onChange={(e) => handleModelChange(e.target.value)}
          className={selectClass}
        >
          {devices.map((d) => (
            <option key={d.modelId} value={d.modelId}>
              {d.modelId.toUpperCase()}
              {d.modelId === autoDetectedModelId ? " (auto)" : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Paper Type */}
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Paper Type
          <InfoTip text="Gap: die-cut labels with gaps between them. Continuous: uncut paper roll." />
        </label>
        <select
          value={settings.paperType}
          onChange={(e) => handlePaperTypeChange(e.target.value as "gap" | "continuous")}
          className={selectClass}
        >
          {supportedPaperTypes.includes("gap") && (
            <option value="gap">Gap (die-cut)</option>
          )}
          {supportedPaperTypes.includes("continuous") && (
            <option value="continuous">Continuous</option>
          )}
        </select>
      </div>

      {/* Label Size */}
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Label Size
          <InfoTip text="Physical dimensions of the label in millimeters (width × height)." />
        </label>
        {customSize ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <input
              type="number"
              value={labelConfig.widthMm}
              min={10}
              max={100}
              onChange={(e) => setLabelConfig(Number(e.target.value), labelConfig.heightMm)}
              className="w-16 px-1.5 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
            <span className="text-gray-400 text-sm">×</span>
            <input
              type="number"
              value={labelConfig.heightMm}
              min={5}
              max={200}
              onChange={(e) => setLabelConfig(labelConfig.widthMm, Number(e.target.value))}
              className="w-16 px-1.5 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700"
            />
            <span className="text-sm text-gray-400">mm</span>
            <button
              onClick={() => setCustomSize(false)}
              className="text-sm text-blue-500 hover:text-blue-600 ml-1"
            >
              Presets
            </button>
          </div>
        ) : (
          <select
            value={currentPreset ? `${currentPreset.widthMm}x${currentPreset.heightMm}` : "custom"}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setCustomSize(true);
                return;
              }
              const [w, h] = e.target.value.split("x").map(Number);
              setLabelConfig(w, h);
            }}
            className={selectClass}
          >
            {sizes.map((s) => (
              <option key={`${s.widthMm}x${s.heightMm}`} value={`${s.widthMm}x${s.heightMm}`}>
                {s.name}
              </option>
            ))}
            <option value="custom">Custom...</option>
          </select>
        )}
      </div>

      {/* Density */}
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Density
          <InfoTip text="Controls how dark the print is. Higher = more heat = darker output." />
        </label>
        <select value={settings.density} onChange={(e) => updateSettings({ density: Number(e.target.value) as 1 | 2 | 3 })}
          className={selectClass}>
          <option value={1}>Light</option>
          <option value={2}>Normal</option>
          <option value={3}>Dark</option>
        </select>
      </div>

      {/* Dither Mode */}
      <div>
        <label className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
          Dither Mode
          <InfoTip text="How grayscale pixels become black/white. Floyd-Steinberg gives smooth gradients, Threshold is sharper." />
        </label>
        <select value={settings.ditherMode} onChange={(e) => updateSettings({ ditherMode: e.target.value as DitherMode })}
          className={selectClass}>
          <option value="floyd-steinberg">Floyd-Steinberg</option>
          <option value="threshold">Threshold</option>
          <option value="none">None</option>
        </select>
      </div>

      {/* Threshold */}
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

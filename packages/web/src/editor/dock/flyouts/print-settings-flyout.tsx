import { Settings, X } from "lucide-react";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { usePrinterStore } from "../../../store/printer-store.ts";
import { getDevice, type LabelSizePreset } from "@thermoprint/core";
import { mmToPx } from "../../../utils/px-mm.ts";

// Fallback sizes when no printer is connected
const FALLBACK_GAP_SIZES: LabelSizePreset[] = [
  { widthMm: 22, heightMm: 12 },
  { widthMm: 30, heightMm: 12 },
  { widthMm: 30, heightMm: 15 },
  { widthMm: 40, heightMm: 12 },
  { widthMm: 40, heightMm: 15 },
  { widthMm: 50, heightMm: 15 },
  { widthMm: 50, heightMm: 30 },
];
const FALLBACK_CONTINUOUS_SIZES: LabelSizePreset[] = [
  { widthMm: 22, heightMm: 12 },
  { widthMm: 30, heightMm: 15 },
  { widthMm: 40, heightMm: 12 },
  { widthMm: 40, heightMm: 15 },
  { widthMm: 50, heightMm: 15 },
];

function useLabelConfig(): {
  supportedPaperTypes: ("gap" | "continuous")[];
  sizesForPaperType: (pt: "gap" | "continuous") => LabelSizePreset[];
  hasProfile: boolean;
} {
  const modelId = usePrinterStore((s) => s.modelId);
  const profile = modelId ? getDevice(modelId) : null;
  const lc = profile?.labelConfig;

  if (lc) {
    return {
      supportedPaperTypes: lc.supportedPaperTypes,
      sizesForPaperType: (pt) =>
        pt === "gap" ? lc.gapSizes : lc.continuousSizes,
      hasProfile: true,
    };
  }

  return {
    supportedPaperTypes: ["gap", "continuous"],
    sizesForPaperType: (pt) =>
      pt === "gap" ? FALLBACK_GAP_SIZES : FALLBACK_CONTINUOUS_SIZES,
    hasProfile: false,
  };
}

interface Props {
  onClose: () => void;
}

export function PrintSettingsFlyout({ onClose }: Props) {
  const printSettings = useEditorV2Store((s) => s.printSettings);
  const paperType = useEditorV2Store((s) => s.paperType);
  const label = useEditorV2Store((s) => s.label);
  const isConnected = usePrinterStore((s) => s.isConnected);
  const modelId = usePrinterStore((s) => s.modelId);
  const uiScale = useEditorV2Store((s) => s.uiScale);
  const setUiScale = useEditorV2Store((s) => s.setUiScale);
  const theme = useEditorV2Store((s) => s.theme);
  const mode = useEditorV2Store((s) => s.mode);
  const setTheme = useEditorV2Store((s) => s.setTheme);
  const setMode = useEditorV2Store((s) => s.setMode);

  const themes = [
    { id: "cyan",     name: "Cyan",     swatch: "#2ad0ff" },
    { id: "amber",    name: "Amber",    swatch: "#ff9f40" },
    { id: "graphite", name: "Graphite", swatch: "#e6e6eb" },
    { id: "violet",   name: "Violet",   swatch: "#a78bfa" },
    { id: "forest",   name: "Forest",   swatch: "#6ecc93" },
    { id: "paper",    name: "Paper",    swatch: "#e2bc7a" },
  ];

  const { supportedPaperTypes, sizesForPaperType, hasProfile } =
    useLabelConfig();
  const availableSizes = sizesForPaperType(paperType);

  const updateSettings = (patch: Partial<typeof printSettings>) =>
    useEditorV2Store.setState((s) => ({
      printSettings: { ...s.printSettings, ...patch },
    }));

  const setPaperType = (pt: "gap" | "continuous") => {
    useEditorV2Store.setState({ paperType: pt });
    // If current label size isn't valid for the new paper type, switch to the first valid size
    const sizes = sizesForPaperType(pt);
    const currentValid = sizes.some(
      (s) => s.widthMm === label.widthMm && s.heightMm === label.heightMm,
    );
    if (!currentValid && sizes.length > 0) {
      const def = sizes[0];
      useEditorV2Store.setState({
        label: {
          widthMm: def.widthMm,
          heightMm: def.heightMm,
          widthPx: mmToPx(def.widthMm),
          heightPx: mmToPx(def.heightMm),
        },
      });
    }
    // Also sync to old printer store
    usePrinterStore.getState().updateSettings({ paperType: pt });
  };

  const setLabelSize = (widthMm: number, heightMm: number) => {
    useEditorV2Store.setState({
      label: {
        widthMm,
        heightMm,
        widthPx: mmToPx(widthMm),
        heightPx: mmToPx(heightMm),
      },
    });
  };

  return (
    <div className="fixed inset-x-2 bottom-20 max-h-[80vh] overflow-y-auto md:max-h-none md:inset-auto md:absolute md:bottom-44 md:left-1/2 md:-translate-x-1/2 md:w-80 bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel z-40">
      <div className="flex items-center justify-between px-3 h-9 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Settings size={14} className="text-accent" />
          <span className="text-ui-base font-semibold text-ink-100">
            Print settings
          </span>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-100">
          <X size={14} />
        </button>
      </div>
      <div className="p-3 space-y-3">
        {/* Interface size */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
              Interface size
            </div>
            <div className="flex items-center gap-2">
              <span className="text-ui-xs font-mono text-ink-100 tabular-nums">
                {Math.round(uiScale * 100)}%
              </span>
              {uiScale !== 1 && (
                <button
                  onClick={() => setUiScale(1)}
                  className="text-ui-2xs font-mono text-ink-400 hover:text-accent hover-fade"
                >
                  Reset
                </button>
              )}
            </div>
          </div>
          <input
            type="range"
            min={0.8}
            max={1.4}
            step={0.05}
            value={uiScale}
            onChange={(e) => setUiScale(parseFloat(e.target.value))}
            className="w-full accent-accent"
          />
          <div className="flex justify-between text-ui-2xs font-mono text-ink-500 mt-0.5">
            <span>80%</span>
            <span>140%</span>
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Theme */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
              Theme
            </div>
            <div className="flex items-center gap-0.5 p-0.5 rounded-md bg-ink-800 border border-white/5">
              {(["dark", "light"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`px-2 h-6 rounded-[3px] text-ui-2xs font-medium capitalize ${
                    mode === m
                      ? "bg-ink-700 text-accent"
                      : "text-ink-400 hover:text-ink-100"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {themes.map((t) => {
              const active = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center gap-1.5 h-8 px-2 rounded-md border hover-fade ${
                    active
                      ? "bg-accent/10 border-accent/40 text-accent"
                      : "bg-ink-800 border-white/5 text-ink-200 hover:border-white/15"
                  }`}
                  title={`${t.name} theme`}
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 ring-1 ring-black/20"
                    style={{ background: t.swatch }}
                  />
                  <span className="text-ui-xs font-medium">{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t border-white/5" />

        {/* Paper type */}
        <div>
          <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
            Paper type
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-ink-800 border border-white/5">
            {(["gap", "continuous"] as const).map((pt) => {
              const supported = supportedPaperTypes.includes(pt);
              return (
                <button
                  key={pt}
                  onClick={() => supported && setPaperType(pt)}
                  disabled={!supported}
                  className={`flex-1 h-7 rounded-[4px] text-ui-sm font-medium ${
                    paperType === pt
                      ? "bg-ink-700 text-accent"
                      : supported
                        ? "text-ink-300 hover:text-ink-100"
                        : "text-ink-600 cursor-not-allowed"
                  }`}
                >
                  {pt === "gap" ? "Gap (die-cut)" : "Continuous"}
                </button>
              );
            })}
          </div>
          {hasProfile &&
            supportedPaperTypes.length === 1 && (
              <div className="text-ui-2xs text-ink-500 mt-1 font-mono">
                Only {supportedPaperTypes[0]} supported by this printer
              </div>
            )}
        </div>

        {/* Label size */}
        <div>
          <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
            Label size
          </div>
          <div className="grid grid-cols-2 gap-1">
            {availableSizes.map((s) => {
              const active =
                s.widthMm === label.widthMm && s.heightMm === label.heightMm;
              return (
                <button
                  key={`${s.widthMm}x${s.heightMm}`}
                  onClick={() => setLabelSize(s.widthMm, s.heightMm)}
                  className={`h-7 rounded-md text-ui-xs font-mono border ${
                    active
                      ? "bg-accent/10 text-accent border-accent/30"
                      : "bg-ink-800 text-ink-300 border-white/5 hover:text-ink-100 hover:bg-ink-750"
                  }`}
                >
                  {s.widthMm} × {s.heightMm} mm
                </button>
              );
            })}
          </div>
        </div>

        {/* Density */}
        <div>
          <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
            Density
          </div>
          <div className="flex items-center gap-1 p-0.5 rounded-md bg-ink-800 border border-white/5">
            {[1, 2, 3].map((d) => (
              <button
                key={d}
                onClick={() => updateSettings({ density: d })}
                className={`flex-1 h-7 rounded-[4px] text-ui-sm font-medium ${
                  printSettings.density === d
                    ? "bg-ink-700 text-accent"
                    : "text-ink-300"
                }`}
              >
                {["Light", "Normal", "Dark"][d - 1]}
              </button>
            ))}
          </div>
        </div>

        {/* Dither */}
        <div>
          <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400 mb-1.5">
            Dither
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { v: "floyd-steinberg", l: "Floyd-S" },
              { v: "threshold", l: "Threshold" },
              { v: "none", l: "None" },
            ].map((o) => (
              <button
                key={o.v}
                onClick={() => updateSettings({ ditherMode: o.v })}
                className={`h-7 rounded-md text-ui-xs font-medium border ${
                  printSettings.ditherMode === o.v
                    ? "bg-accent/10 text-accent border-accent/30"
                    : "bg-ink-800 text-ink-300 border-white/5"
                }`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>

        {/* Threshold */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400">
              Threshold
            </div>
            <div className="text-ui-sm font-mono text-ink-100">
              {printSettings.threshold}
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={printSettings.threshold}
            onChange={(e) => updateSettings({ threshold: Number(e.target.value) })}
            className="w-full accent-accent"
          />
        </div>

        {/* Printer info */}
        <div className="pt-2 border-t border-white/5 text-ui-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-400">Printer</span>
            <span className="text-ink-100 font-mono">
              {isConnected ? (modelId || "Connected") : "Not connected"}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-ink-400">Current label</span>
            <span className="text-ink-100 font-mono">
              {label.widthMm} × {label.heightMm} mm · {paperType}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

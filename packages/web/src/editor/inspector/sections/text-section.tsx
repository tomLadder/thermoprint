import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  RefreshCw,
  X,
} from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import {
  Section,
  Field,
  NumInput,
  TextInput,
  Select,
  SegBtn,
  SegGroup,
  ColorInput,
} from "../fields.tsx";
import {
  type DatePreset,
  DATE_PRESET_OPTIONS,
  PRESET_FORMATS,
} from "../../../lib/date-format.ts";

interface Props {
  element: BaseElement;
}

export function TextSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);

  const p = element.props as {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    letterSpacing?: number;
    fill?: string;
    align?: string;
    italic?: boolean;
    uppercase?: boolean;
    datePreset?: DatePreset;
    dateLocale?: string;
  };

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  const isDate = !!p.datePreset;

  // Compute which preset matches the current text (auto-switch to Custom if edited)
  const activePreset: DatePreset = (() => {
    if (!p.datePreset) return "date";
    const text = p.text || "";
    for (const [key, fmt] of Object.entries(PRESET_FORMATS)) {
      if (text === fmt) return key as DatePreset;
    }
    return "custom";
  })();

  const handlePresetChange = (v: string) => {
    const preset = v as DatePreset;
    if (preset === "custom") return; // Can't select custom — it's computed
    update({ datePreset: preset, text: PRESET_FORMATS[preset] });
  };

  const handleRefresh = () => {
    // Force canvas re-render with current timestamp
    update({ _ts: Date.now() });
  };

  return (
    <Section title={isDate ? "Date" : "Text"}>
      <Field label="Content">
        <div title={isDate ? `Format codes:\nDD = day, MM = month, YYYY, YY = year, HH:mm = time\nMMMM, MMM = month name, dddd, ddd = weekday name\nFuture dates: add +days (e.g. DD+7, MM+1, YYYY+1)` : undefined}>
          <TextInput
            value={p.text || ""}
            onChange={(v) => update({ text: v })}
            placeholder={isDate ? "e.g. DD+7.MM.YYYY" : undefined}
          />
        </div>
      </Field>

      {/* Date controls — only shown for date elements */}
      {isDate && (
        <div className="mt-1.5 space-y-1.5">
          <Field label="Preset">
            <Select
              value={activePreset}
              onChange={handlePresetChange}
              options={DATE_PRESET_OPTIONS}
            />
          </Field>
          <div className="flex gap-1.5 items-center">
            <div className="flex-1 min-w-0">
              <Field label="Locale">
                <div className="relative" title={`Language code: en, uk, de, etc.\nAffects month/day names and date order.`}>
                  <TextInput
                    value={p.dateLocale || ""}
                    onChange={(v) => update({ dateLocale: v || undefined })}
                    placeholder="auto"
                  />
                  {p.dateLocale && (
                    <button
                      type="button"
                      onClick={() => update({ dateLocale: undefined })}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded text-ink-400 hover:text-ink-100 cursor-pointer"
                      title="Reset to auto (browser language)"
                    >
                      <X size={10} />
                    </button>
                  )}
                </div>
              </Field>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              className="h-7 px-2.5 rounded-md bg-ink-800 border border-white/5 text-ink-300 hover:text-ink-50 hover:border-white/10 flex items-center gap-1.5 text-ui-xs font-medium cursor-pointer transition-colors shrink-0"
              title="Re-evaluate all tokens to current date/time"
            >
              <RefreshCw size={12} />
              <span>Refresh Dates</span>
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
        <Field label="Size" mono>
          <NumInput
            value={p.fontSize || 18}
            onChange={(v) => update({ fontSize: v })}
            suffix="px"
          />
        </Field>
        <Field label="Track" mono>
          <NumInput
            value={p.letterSpacing || 0}
            onChange={(v) => update({ letterSpacing: v })}
            suffix="px"
            step={0.1}
          />
        </Field>
      </div>
      <div className="mt-1.5">
        <Field label="Font">
          <Select
            value={p.fontFamily || "Inter"}
            onChange={(v) => update({ fontFamily: v })}
            options={[
              { value: "Inter", label: "Inter" },
              { value: "JetBrains Mono", label: "JetBrains Mono" },
              { value: "Arial", label: "Arial" },
              { value: "Georgia", label: "Georgia" },
              { value: "Courier New", label: "Courier New" },
            ]}
          />
        </Field>
      </div>
      <div className="mt-1.5 flex gap-1.5">
        <SegGroup>
          <SegBtn
            active={(p.fontWeight || 400) >= 600}
            onClick={() =>
              update({ fontWeight: (p.fontWeight || 400) >= 600 ? 400 : 700 })
            }
            title="Bold"
          >
            <Bold size={14} />
          </SegBtn>
          <SegBtn
            active={!!p.italic}
            onClick={() => update({ italic: !p.italic })}
            title="Italic"
          >
            <Italic size={14} />
          </SegBtn>
        </SegGroup>
        <SegGroup>
          <SegBtn
            active={!!p.uppercase}
            onClick={() => update({ uppercase: !p.uppercase })}
            title="All Caps (TT)"
          >
            <span className="font-bold text-[11px] font-mono leading-none px-1">TT</span>
          </SegBtn>
        </SegGroup>
        <SegGroup>
          <SegBtn
            active={p.align === "left"}
            onClick={() => update({ align: "left" })}
          >
            <AlignLeft size={14} />
          </SegBtn>
          <SegBtn
            active={p.align === "center"}
            onClick={() => update({ align: "center" })}
          >
            <AlignCenter size={14} />
          </SegBtn>
          <SegBtn
            active={p.align === "right"}
            onClick={() => update({ align: "right" })}
          >
            <AlignRight size={14} />
          </SegBtn>
        </SegGroup>
      </div>
      <div className="mt-1.5">
        <Field label="Color">
          <ColorInput
            value={p.fill || "#000000"}
            onChange={(v) => update({ fill: v })}
          />
        </Field>
      </div>
    </Section>
  );
}

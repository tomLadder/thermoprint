import {
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignVerticalJustifyStart,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
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
    verticalAlign?: string;
    marginH?: number;
    marginV?: number;
    fixedBox?: boolean;
    autoFit?: boolean;
    fitStep?: number;
    fitTries?: number;
    actSize?: number;
    actTries?: number;
    italic?: boolean;
  };

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  return (
    <Section title="Text">
      <Field label="Content">
        <TextInput value={p.text || ""} onChange={(v) => update({ text: v })} />
      </Field>
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
            active={p.align === "left"}
            onClick={() => update({ align: "left" })}
            title="Align left"
          >
            <AlignLeft size={14} />
          </SegBtn>
          <SegBtn
            active={p.align === "center"}
            onClick={() => update({ align: "center" })}
            title="Center horizontally"
          >
            <AlignCenter size={14} />
          </SegBtn>
          <SegBtn
            active={p.align === "right"}
            onClick={() => update({ align: "right" })}
            title="Align right"
          >
            <AlignRight size={14} />
          </SegBtn>
        </SegGroup>
        {p.fixedBox && (
          <SegGroup>
            <SegBtn
              active={(p.verticalAlign || "middle") === "top"}
              onClick={() => update({ verticalAlign: "top" })}
              title="Align top"
            >
              <AlignVerticalJustifyStart size={14} />
            </SegBtn>
            <SegBtn
              active={(p.verticalAlign || "middle") === "middle"}
              onClick={() => update({ verticalAlign: "middle" })}
              title="Center vertically"
            >
              <AlignVerticalJustifyCenter size={14} />
            </SegBtn>
            <SegBtn
              active={(p.verticalAlign || "middle") === "bottom"}
              onClick={() => update({ verticalAlign: "bottom" })}
              title="Align bottom"
            >
              <AlignVerticalJustifyEnd size={14} />
            </SegBtn>
          </SegGroup>
        )}
      </div>
      {p.fixedBox && (
        <div className="mt-1.5">
          <Field label="Margin">
            <div className="space-y-1">
              <div className="grid grid-cols-2 gap-1">
                <NumInput
                  value={p.marginH ?? 4}
                  onChange={(v) => {
                    const h = Math.max(0, Math.round(v));
                    const vMargin = p.marginV ?? 4;
                    const { label } = useEditorV2Store.getState();
                    updateElement(element.id, {
                      x: h,
                      y: vMargin,
                      width: Math.max(5, label.widthPx - 2 * h),
                      height: Math.max(5, label.heightPx - 2 * vMargin),
                      rotation: 0,
                      props: { marginH: h },
                    });
                  }}
                  suffix="px H"
                />
                <NumInput
                  value={p.marginV ?? 4}
                  onChange={(v) => {
                    const vMargin = Math.max(0, Math.round(v));
                    const h = p.marginH ?? 4;
                    const { label } = useEditorV2Store.getState();
                    updateElement(element.id, {
                      x: h,
                      y: vMargin,
                      width: Math.max(5, label.widthPx - 2 * h),
                      height: Math.max(5, label.heightPx - 2 * vMargin),
                      rotation: 0,
                      props: { marginV: vMargin },
                    });
                  }}
                  suffix="px V"
                />
              </div>
              <div className="grid grid-cols-3 gap-1">
                {[
                  { label: "0:0", h: 0, v: 0 },
                  { label: "4:4", h: 4, v: 4 },
                  { label: "8:4", h: 8, v: 4 },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      const { label } = useEditorV2Store.getState();
                      updateElement(element.id, {
                        x: preset.h,
                        y: preset.v,
                        width: Math.max(5, label.widthPx - 2 * preset.h),
                        height: Math.max(5, label.heightPx - 2 * preset.v),
                        rotation: 0,
                        props: { marginH: preset.h, marginV: preset.v },
                      });
                    }}
                    className="h-7 rounded-md bg-ink-800 border border-white/5 text-ui-xs text-ink-300 hover:text-ink-100 hover:border-accent/40"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </Field>
        </div>
      )}
      {p.fixedBox && (
        <div className="mt-1.5 space-y-1.5">
          <Field label="Actual" mono>
            <div className="h-7 flex items-center rounded-md bg-ink-800 border border-white/5 px-2 text-ui-sm text-ink-300 font-mono tabular-nums">
              {Math.round(p.actSize ?? p.fontSize ?? 48)} px
            </div>
          </Field>
          <Field label="Auto fit">
            <SegGroup>
              <SegBtn
                active={!!p.autoFit}
                onClick={() => update({ autoFit: !p.autoFit })}
                title="Fit text to the fixed box"
              >
                Fit
              </SegBtn>
            </SegGroup>
          </Field>
          <Field label="Step" mono>
            <NumInput
              value={p.fitStep ?? 1}
              onChange={(v) => update({ fitStep: Math.max(1, Math.round(v)) })}
              suffix="px"
            />
          </Field>
          <Field label="Tries" mono>
            <NumInput
              value={p.fitTries ?? 0}
              onChange={(v) => update({ fitTries: Math.max(0, Math.round(v)) })}
            />
          </Field>
        </div>
      )}
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

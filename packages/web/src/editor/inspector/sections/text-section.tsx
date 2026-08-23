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
    fixedBox?: boolean;
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
        <button
          type="button"
          onClick={() => {
            const { label } = useEditorV2Store.getState();
            updateElement(element.id, {
              x: 8,
              y: 4,
              width: Math.max(5, label.widthPx - 16),
              height: Math.max(5, label.heightPx - 8),
              rotation: 0,
            });
          }}
          className="mt-1.5 w-full h-7 rounded-md bg-ink-800 border border-white/5 text-ui-xs text-ink-300 hover:text-ink-100 hover:border-accent/40"
        >
          Max Box
        </button>
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

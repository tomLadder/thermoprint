import {
  AlignHorizontalJustifyCenter,
  AlignVerticalJustifyCenter,
} from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, NumInput } from "../fields.tsx";

interface Props {
  element: BaseElement;
}

export function TransformSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const label = useEditorV2Store((s) => s.label);

  const update = (patch: Partial<BaseElement>) =>
    updateElement(element.id, patch);

  const alignH = () =>
    update({ x: Math.round((label.widthPx - element.width) / 2) });
  const alignV = () =>
    update({ y: Math.round((label.heightPx - element.height) / 2) });
  const alignBoth = () =>
    update({
      x: Math.round((label.widthPx - element.width) / 2),
      y: Math.round((label.heightPx - element.height) / 2),
    });

  return (
    <Section title="Transform">
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="X" mono>
          <NumInput value={element.x} onChange={(v) => update({ x: v })} suffix="px" />
        </Field>
        <Field label="Y" mono>
          <NumInput value={element.y} onChange={(v) => update({ y: v })} suffix="px" />
        </Field>
        <Field label="W" mono>
          <NumInput value={element.width} onChange={(v) => update({ width: v })} suffix="px" />
        </Field>
        <Field label="H" mono>
          <NumInput value={element.height} onChange={(v) => update({ height: v })} suffix="px" />
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mt-1.5">
        <Field label="Rot" mono>
          <NumInput value={element.rotation} onChange={(v) => update({ rotation: v })} suffix="°" />
        </Field>
        <div className="flex items-center gap-1">
          <button
            onClick={alignH}
            className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center"
            title="Center horizontally"
          >
            <AlignHorizontalJustifyCenter size={14} />
          </button>
          <button
            onClick={alignV}
            className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ink-300 hover:text-ink-100 flex items-center justify-center"
            title="Center vertically"
          >
            <AlignVerticalJustifyCenter size={14} />
          </button>
          <button
            onClick={alignBoth}
            className="flex-1 h-7 rounded-md bg-ink-800 border border-white/5 hover:bg-ink-750 text-ui-xs font-mono text-ink-300 hover:text-ink-100"
            title="Center both"
          >
            CTR
          </button>
        </div>
      </div>
    </Section>
  );
}

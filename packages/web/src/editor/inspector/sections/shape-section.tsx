import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, NumInput, ColorInput } from "../fields.tsx";

interface Props {
  element: BaseElement;
}

export function ShapeSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);

  const p = element.props as {
    stroke?: string;
    strokeWidth?: number;
    fill?: string;
  };

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  return (
    <Section title={element.type === "line" ? "Line" : "Rectangle"}>
      <div className="grid grid-cols-2 gap-1.5">
        <Field label="Stroke">
          <ColorInput
            value={p.stroke || "#000000"}
            onChange={(v) => update({ stroke: v })}
          />
        </Field>
        <Field label="Width" mono>
          <NumInput
            value={p.strokeWidth ?? 2}
            onChange={(v) => update({ strokeWidth: v })}
            suffix="px"
          />
        </Field>
      </div>
      {element.type === "rect" && (
        <div className="mt-1.5">
          <Field label="Fill">
            <ColorInput
              value={p.fill || "transparent"}
              onChange={(v) => update({ fill: v })}
            />
          </Field>
        </div>
      )}
    </Section>
  );
}

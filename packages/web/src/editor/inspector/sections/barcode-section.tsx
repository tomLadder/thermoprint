import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Section, Field, TextInput, Select } from "../fields.tsx";

interface Props {
  element: BaseElement;
}

export function BarcodeSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);

  const p = element.props as {
    content?: string;
    format?: string;
    displayValue?: boolean;
  };

  const update = (patch: Record<string, unknown>) =>
    updateElement(element.id, { props: patch });

  return (
    <Section title="Barcode">
      <Field label="Data">
        <TextInput
          value={p.content || ""}
          onChange={(v) => update({ content: v })}
        />
      </Field>
      <div className="mt-1.5">
        <Field label="Format">
          <Select
            value={p.format || "CODE128"}
            onChange={(v) => update({ format: v })}
            options={["CODE128", "EAN13", "UPC", "CODE39", "ITF14"].map(
              (f) => ({ value: f, label: f }),
            )}
          />
        </Field>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="checkbox"
          checked={p.displayValue ?? true}
          onChange={(e) => update({ displayValue: e.target.checked })}
          className="accent-accent"
        />
        <span className="text-ui-sm text-ink-300">
          Show value below bars
        </span>
      </div>
    </Section>
  );
}

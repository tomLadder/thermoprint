import type { EditorElement, BarcodeProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";

const FORMATS: BarcodeProps["format"][] = ["CODE128", "EAN13", "UPC", "CODE39", "ITF14"];

export function BarcodeProperties({ element }: { element: EditorElement }) {
  const props = element.props as BarcodeProps;
  const updateElementProps = useEditorStore((s) => s.updateElementProps);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Content</label>
        <input type="text" value={props.content}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { content: e.target.value }); }}
          className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Format</label>
        <select value={props.format}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { format: e.target.value as BarcodeProps["format"] }); }}
          className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
          {FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="flex items-center gap-2">
        <input type="checkbox" id="displayValue" checked={props.displayValue}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { displayValue: e.target.checked }); }}
          className="rounded" />
        <label htmlFor="displayValue" className="text-sm text-gray-600 dark:text-gray-400">Show text below barcode</label>
      </div>
    </div>
  );
}

import type { EditorElement, QrCodeProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";

export function QrCodeProperties({ element }: { element: EditorElement }) {
  const props = element.props as QrCodeProps;
  const updateElementProps = useEditorStore((s) => s.updateElementProps);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Content</label>
        <textarea value={props.content} rows={3}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { content: e.target.value }); }}
          className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Error Correction</label>
        <select value={props.errorCorrectionLevel}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { errorCorrectionLevel: e.target.value as QrCodeProps["errorCorrectionLevel"] }); }}
          className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700">
          <option value="L">Low (7%)</option>
          <option value="M">Medium (15%)</option>
          <option value="Q">Quartile (25%)</option>
          <option value="H">High (30%)</option>
        </select>
      </div>
    </div>
  );
}

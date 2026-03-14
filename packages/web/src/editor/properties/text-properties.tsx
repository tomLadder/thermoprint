import type { EditorElement, TextProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";
import { FontControls } from "../toolbar/font-controls.tsx";

export function TextProperties({ element }: { element: EditorElement }) {
  const props = element.props as TextProps;
  const updateElementProps = useEditorStore((s) => s.updateElementProps);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Text</label>
        <textarea value={props.text} rows={3}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { text: e.target.value }); }}
          className="w-full mt-1 px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 resize-none" />
      </div>
      <FontControls elementId={element.id} props={props} />
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Color</label>
        <input type="color" value={props.fill}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { fill: e.target.value }); }}
          className="w-full h-8 mt-1 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
      </div>
    </div>
  );
}

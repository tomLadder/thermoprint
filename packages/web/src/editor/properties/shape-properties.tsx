import type { EditorElement, ShapeProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";

export function ShapeProperties({ element }: { element: EditorElement }) {
  const props = element.props as ShapeProps;
  const updateElementProps = useEditorStore((s) => s.updateElementProps);
  const pushHistory = useEditorStore((s) => s.pushHistory);

  return (
    <div className="flex flex-col gap-3">
      {props.shapeType === "rect" && (
        <div>
          <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Fill</label>
          <div className="flex items-center gap-2 mt-1">
            <input type="color" value={props.fill || "#ffffff"}
              onChange={(e) => { pushHistory(); updateElementProps(element.id, { fill: e.target.value }); }}
              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
            <button onClick={() => { pushHistory(); updateElementProps(element.id, { fill: "" }); }}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">No fill</button>
          </div>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stroke</label>
        <input type="color" value={props.stroke}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { stroke: e.target.value }); }}
          className="w-full h-8 mt-1 rounded border border-gray-300 dark:border-gray-600 cursor-pointer" />
      </div>
      <div>
        <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Stroke Width</label>
        <input type="range" min={1} max={10} value={props.strokeWidth}
          onChange={(e) => { pushHistory(); updateElementProps(element.id, { strokeWidth: Number(e.target.value) }); }}
          className="w-full mt-1" />
        <span className="text-sm text-gray-400">{props.strokeWidth}px</span>
      </div>
    </div>
  );
}

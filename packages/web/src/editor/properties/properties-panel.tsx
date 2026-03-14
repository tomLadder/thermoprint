import { useEditorStore } from "../../store/editor-store.ts";
import { TextProperties } from "./text-properties.tsx";
import { ImageProperties } from "./image-properties.tsx";
import { QrCodeProperties } from "./qr-code-properties.tsx";
import { BarcodeProperties } from "./barcode-properties.tsx";
import { ShapeProperties } from "./shape-properties.tsx";
import { Tooltip } from "../../components/tooltip.tsx";
import { Trash2, ArrowUp, ArrowDown, ArrowUpToLine, ArrowDownToLine, AlignCenterHorizontal, AlignCenterVertical } from "lucide-react";

export function PropertiesPanel() {
  const elements = useEditorStore((s) => s.elements);
  const selectedId = useEditorStore((s) => s.selectedId);
  const removeElement = useEditorStore((s) => s.removeElement);
  const updateElement = useEditorStore((s) => s.updateElement);
  const moveElement = useEditorStore((s) => s.moveElement);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const labelConfig = useEditorStore((s) => s.labelConfig);

  const element = elements.find((el) => el.id === selectedId);

  if (!element) {
    return (
      <div className="w-56 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4">
        <p className="text-sm text-gray-400 dark:text-gray-500">Select an element to edit its properties</p>
      </div>
    );
  }

  const iconBtn = "p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-pointer";

  return (
    <div className="w-56 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 p-4 overflow-y-auto">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold capitalize">{element.type}</h3>
        <div className="flex items-center gap-0.5">
          <Tooltip label="Bring to front">
            <button className={iconBtn} onClick={() => moveElement(element.id, "top")}><ArrowUpToLine size={16} /></button>
          </Tooltip>
          <Tooltip label="Move up">
            <button className={iconBtn} onClick={() => moveElement(element.id, "up")}><ArrowUp size={16} /></button>
          </Tooltip>
          <Tooltip label="Move down">
            <button className={iconBtn} onClick={() => moveElement(element.id, "down")}><ArrowDown size={16} /></button>
          </Tooltip>
          <Tooltip label="Send to back">
            <button className={iconBtn} onClick={() => moveElement(element.id, "bottom")}><ArrowDownToLine size={16} /></button>
          </Tooltip>
          <Tooltip label="Delete">
            <button className={`${iconBtn} text-red-500 hover:text-red-600`} onClick={() => removeElement(element.id)}><Trash2 size={16} /></button>
          </Tooltip>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {(["x", "y", "width", "height"] as const).map((key) => (
          <div key={key}>
            <label className="text-xs uppercase font-medium text-gray-400">{key}</label>
            <input type="number" value={Math.round(element[key])}
              onChange={(e) => { pushHistory(); updateElement(element.id, { [key]: Number(e.target.value) }); }}
              className="w-full px-1.5 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
          </div>
        ))}
        <div>
          <label className="text-xs uppercase font-medium text-gray-400">Rotation</label>
          <input type="number" value={Math.round(element.rotation)}
            onChange={(e) => { pushHistory(); updateElement(element.id, { rotation: Number(e.target.value) }); }}
            className="w-full px-1.5 py-0.5 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700" />
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4">
        <Tooltip label="Center horizontally">
          <button className={iconBtn} onClick={() => {
            pushHistory();
            updateElement(element.id, { x: Math.round((labelConfig.widthPx - element.width) / 2) });
          }}>
            <AlignCenterHorizontal size={16} />
          </button>
        </Tooltip>
        <Tooltip label="Center vertically">
          <button className={iconBtn} onClick={() => {
            pushHistory();
            updateElement(element.id, { y: Math.round((labelConfig.heightPx - element.height) / 2) });
          }}>
            <AlignCenterVertical size={16} />
          </button>
        </Tooltip>
        <Tooltip label="Center both">
          <button className={`${iconBtn} text-sm`} onClick={() => {
            pushHistory();
            updateElement(element.id, {
              x: Math.round((labelConfig.widthPx - element.width) / 2),
              y: Math.round((labelConfig.heightPx - element.height) / 2),
            });
          }}>
            <span className="text-xs font-medium">Center</span>
          </button>
        </Tooltip>
      </div>

      <div className="border-t border-gray-200 dark:border-gray-700 pt-3">
        {element.type === "text" && <TextProperties element={element} />}
        {element.type === "image" && <ImageProperties element={element} />}
        {element.type === "qrcode" && <QrCodeProperties element={element} />}
        {element.type === "barcode" && <BarcodeProperties element={element} />}
        {(element.type === "rect" || element.type === "line") && <ShapeProperties element={element} />}
      </div>
    </div>
  );
}

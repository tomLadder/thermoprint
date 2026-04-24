import {
  Type,
  QrCode,
  Barcode,
  Square,
  Minus,
  ImageIcon,
  Layers,
  X,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEditorV2Store, type BaseElement } from "../../../store/editor-store.ts";

const ICON_FOR_TYPE: Record<string, LucideIcon> = {
  text: Type,
  image: ImageIcon,
  qrcode: QrCode,
  barcode: Barcode,
  rect: Square,
  line: Minus,
};

function labelFor(el: BaseElement): string {
  if (el.type === "text") return (el.props.text as string) || "Text";
  const labels: Record<string, string> = {
    qrcode: "QR Code",
    barcode: "Barcode",
    rect: "Rectangle",
    line: "Line",
    image: "Image",
  };
  return labels[el.type] || el.type;
}

interface Props {
  onClose: () => void;
}

export function LayersFlyout({ onClose }: Props) {
  const elements = useEditorV2Store((s) => s.elements);
  const selectedIds = useEditorV2Store((s) => s.selectedIds);
  const selectOnly = useEditorV2Store((s) => s.selectOnly);
  const zOrder = useEditorV2Store((s) => s.zOrder);

  const reversed = [...elements].reverse();

  return (
    <div className="fixed inset-x-2 bottom-20 max-h-[80vh] overflow-y-auto md:max-h-none md:overflow-hidden md:inset-auto md:absolute md:bottom-44 md:left-1/2 md:-translate-x-1/2 md:w-80 bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel z-40">
      <div className="flex items-center justify-between px-3 h-9 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Layers size={14} className="text-accent" />
          <span className="text-ui-base font-semibold text-ink-100">Layers</span>
          <span className="text-ui-xs font-mono text-ink-400">
            {elements.length}
          </span>
        </div>
        <button onClick={onClose} className="text-ink-400 hover:text-ink-100">
          <X size={14} />
        </button>
      </div>
      <div className="max-h-72 overflow-y-auto py-1">
        {reversed.length === 0 && (
          <div className="px-4 py-6 text-center text-ui-sm text-ink-500">
            No elements yet
          </div>
        )}
        {reversed.map((el) => {
          const Icon = ICON_FOR_TYPE[el.type] || Square;
          const sel = selectedIds.includes(el.id);
          return (
            <div
              key={el.id}
              onClick={() => selectOnly([el.id])}
              className={`group flex items-center gap-2 px-3 h-7 cursor-pointer ${
                sel
                  ? "bg-accent/10 text-accent"
                  : "text-ink-300 hover:bg-white/5"
              }`}
            >
              <Icon size={14} className="shrink-0" />
              <span className="flex-1 text-ui-sm truncate">
                {labelFor(el)}
              </span>
              <span className="font-mono text-ui-2xs text-ink-500 opacity-0 group-hover:opacity-100">
                {Math.round(el.width)}×{Math.round(el.height)}
              </span>
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    zOrder(el.id, "up");
                  }}
                  className="w-5 h-5 rounded hover:bg-white/5 text-ink-400 flex items-center justify-center"
                >
                  <ChevronUp size={13} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    zOrder(el.id, "down");
                  }}
                  className="w-5 h-5 rounded hover:bg-white/5 text-ink-400 flex items-center justify-center"
                >
                  <ChevronDown size={13} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { Rect } from "react-konva";
import { useEditorV2Store } from "../../store/editor-store.ts";

export function LabelPaper() {
  const label = useEditorV2Store((s) => s.label);

  return (
    <Rect
      x={0}
      y={0}
      width={label.widthPx}
      height={label.heightPx}
      fill="#ffffff"
      cornerRadius={4}
      shadowColor="rgba(0,0,0,0.3)"
      shadowBlur={20}
      shadowOffsetY={4}
      listening={false}
    />
  );
}

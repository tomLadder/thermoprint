import { Group, Line, Rect, Text } from "react-konva";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { getStockPx } from "../../label/cable-stock.ts";

/**
 * Label paper silhouette.
 * For cable formats, draws both printable panels plus the wrap tail.
 * The mirrored panel is visually muted so it reads as non-editable.
 */
export function LabelPaper() {
  const label = useEditorV2Store((s) => s.label);
  const stock = getStockPx(label);

  if (!label.cable) {
    return (
      <Rect
        id="label-bg"
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

  const { panelPx, tailPx, heightPx, tailHeightPx } = stock;
  const panelsW = panelPx * 2;
  const tailY = (heightPx - tailHeightPx) / 2;
  const r = 4;

  return (
    <Group listening={false}>
      {/* Soft shadow for the whole stock */}
      <Rect
        x={0}
        y={0}
        width={panelsW + tailPx}
        height={heightPx}
        fill="transparent"
        shadowColor="rgba(0,0,0,0.3)"
        shadowBlur={20}
        shadowOffsetY={4}
        listening={false}
      />

      {/* Editable design panel */}
      <Rect
        id="label-bg"
        x={0}
        y={0}
        width={panelPx}
        height={heightPx}
        fill="#ffffff"
        cornerRadius={[r, 0, 0, r]}
        listening={false}
      />

      {/* Mirrored panel — cooler/muted fill to signal non-editable */}
      <Rect
        x={panelPx}
        y={0}
        width={panelPx}
        height={heightPx}
        fill="#f0f2f5"
        listening={false}
      />

      {/* Fold guide between panels */}
      <Line
        points={[panelPx, 2, panelPx, heightPx - 2]}
        stroke="rgba(0,0,0,0.22)"
        strokeWidth={1}
        dash={[3, 3]}
        listening={false}
      />

      {/* Wrap tail — narrower adhesive section */}
      <Rect
        x={panelsW}
        y={tailY}
        width={tailPx}
        height={tailHeightPx}
        fill="#e8eaee"
        cornerRadius={[0, r, r, 0]}
        listening={false}
      />

      {/* Slight neck where tail meets the panels */}
      <Rect
        x={panelsW - 1}
        y={tailY}
        width={2}
        height={tailHeightPx}
        fill="#e8eaee"
        listening={false}
      />

      {/* Non-editable cue on mirrored panel */}
      <Text
        x={panelPx + 4}
        y={3}
        width={panelPx - 8}
        text="mirror · not editable"
        fontSize={Math.max(7, Math.min(10, heightPx * 0.18))}
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fill="rgba(0,0,0,0.28)"
        align="center"
        listening={false}
      />
    </Group>
  );
}

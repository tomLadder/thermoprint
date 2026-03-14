import { forwardRef, useRef, useState, useEffect, useCallback } from "react";
import { Stage, Layer, Rect } from "react-konva";
import type Konva from "konva";
import { useEditorStore } from "../store/editor-store.ts";
import { usePrinterStore } from "../store/printer-store.ts";
import { TextElement } from "./elements/text-element.tsx";
import { ImageElement } from "./elements/image-element.tsx";
import { QrCodeElement } from "./elements/qr-code-element.tsx";
import { BarcodeElement } from "./elements/barcode-element.tsx";
import { ShapeElement } from "./elements/shape-element.tsx";

const MIN_SCALE = 1;
const MAX_SCALE = 5;
const PADDING = 80;
const GAP_PX_BASE = 30;

function GhostLabel({ displayW, displayH, radius }: { displayW: number; displayH: number; radius: number }) {
  return (
    <div
      style={{
        width: displayW,
        height: displayH,
        borderRadius: radius,
        flexShrink: 0,
        background: "white",
        opacity: 0.45,
      }}
      className="dark:!bg-gray-600"
    />
  );
}

function renderElements(
  elements: ReturnType<typeof useEditorStore.getState>["elements"],
  selectedId: string | null,
) {
  return elements.map((el) => {
    const isSelected = el.id === selectedId;
    switch (el.type) {
      case "text":
        return <TextElement key={el.id} element={el} isSelected={isSelected} />;
      case "image":
        return <ImageElement key={el.id} element={el} isSelected={isSelected} />;
      case "qrcode":
        return <QrCodeElement key={el.id} element={el} isSelected={isSelected} />;
      case "barcode":
        return <BarcodeElement key={el.id} element={el} isSelected={isSelected} />;
      case "rect":
      case "line":
        return <ShapeElement key={el.id} element={el} isSelected={isSelected} />;
      default:
        return null;
    }
  });
}

export const Canvas = forwardRef<Konva.Stage>(function Canvas(_props, ref) {
  const elements = useEditorStore((s) => s.elements);
  const selectedId = useEditorStore((s) => s.selectedId);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const labelConfig = useEditorStore((s) => s.labelConfig);
  const paperType = usePrinterStore((s) => s.settings.paperType);

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2.5);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 600 });
  const [ready, setReady] = useState(false);

  const { widthPx, heightPx } = labelConfig;

  const computeScale = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cw = el.clientWidth;
    const ch = el.clientHeight;
    setContainerSize({ w: cw, h: ch });

    const availW = cw - PADDING * 2;
    const availH = ch - PADDING * 2;
    const isGap = paperType === "gap";
    const shrink = isGap ? 0.6 : 0.85;
    const fitW = (availW * shrink) / widthPx;
    const fitH = availH / heightPx;
    const fit = Math.min(fitW, fitH);
    setScale(Math.min(MAX_SCALE, Math.max(MIN_SCALE, fit)));
    setReady(true);
  }, [widthPx, heightPx, paperType]);

  useEffect(() => {
    computeScale();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(computeScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [computeScale]);

  const displayW = widthPx * scale;
  const displayH = heightPx * scale;
  const isGap = paperType === "gap";
  const gapPx = GAP_PX_BASE * scale;
  const borderRadius = Math.round(10 * scale);

  // Layer offset to center the label within the full-size Stage
  const layerX = (containerSize.w - displayW) / 2;
  const layerY = (containerSize.h - displayH) / 2;

  const handleDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    if (e.target === e.target.getStage() || e.target.attrs.id === "label-bg") {
      setSelectedId(null);
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        flex: 1,
        minHeight: 0,
        minWidth: 0,
        position: "relative",
        overflow: "hidden",
        opacity: ready ? 1 : 0,
        transition: "opacity 0.15s ease-in",
      }}
      className="bg-gray-100 dark:bg-gray-900"
    >
      {/* Gap mode decorations (HTML overlay) */}
      {isGap && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexShrink: 0, position: "relative" }}>
            {/* Backing paper strip */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: displayH + 48,
                borderRadius: 4,
              }}
              className="bg-gray-200 dark:bg-gray-700"
            />
            {/* Left ghost */}
            <div style={{ marginRight: gapPx }}>
              <GhostLabel displayW={displayW} displayH={displayH} radius={borderRadius} />
            </div>
            {/* Main label outline */}
            <div
              style={{
                width: displayW,
                height: displayH,
                flexShrink: 0,
                borderRadius,
                position: "relative",
                zIndex: 1,
                boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
              }}
              className="ring-2 ring-blue-400/30"
            />
            {/* Right ghost */}
            <div style={{ marginLeft: gapPx }}>
              <GhostLabel displayW={displayW} displayH={displayH} radius={borderRadius} />
            </div>
          </div>
        </div>
      )}

      {/* Continuous mode: label shadow/border decoration */}
      {!isGap && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
            zIndex: 0,
          }}
        >
          <div
            style={{
              width: displayW,
              height: displayH,
              flexShrink: 0,
              borderRadius,
              boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
            }}
          />
        </div>
      )}

      {/* Full-size Stage — elements can extend beyond label bounds */}
      <Stage
        ref={ref}
        width={containerSize.w}
        height={containerSize.h}
        onClick={handleDeselect}
        onTap={handleDeselect}
        style={{ position: "relative", zIndex: 1 }}
      >
        <Layer x={layerX} y={layerY} scaleX={scale} scaleY={scale}>
          <Rect
            id="label-bg"
            x={0}
            y={0}
            width={widthPx}
            height={heightPx}
            fill="#ffffff"
            cornerRadius={10}
          />
          {renderElements(elements, selectedId)}
        </Layer>
      </Stage>
    </div>
  );
});

import { useCallback, type RefObject } from "react";
import type Konva from "konva";
import type { RawImageData } from "@thermoprint/core";
import { usePrinterStore } from "../store/printer-store.ts";
import { useEditorStore } from "../store/editor-store.ts";

/**
 * Capture just the label region from the full-size stage at 1:1 pixel resolution.
 */
function captureLabel(stage: Konva.Stage, widthPx: number, heightPx: number): HTMLCanvasElement {
  const layer = stage.getLayers()[0];
  const origStageW = stage.width();
  const origStageH = stage.height();
  const origLayerX = layer.x();
  const origLayerY = layer.y();
  const displayScale = layer.scaleX();

  const displayW = widthPx * displayScale;
  const displayH = heightPx * displayScale;

  // Temporarily resize so toCanvas captures only the label
  stage.width(displayW);
  stage.height(displayH);
  layer.x(0);
  layer.y(0);

  const canvas = stage.toCanvas({ pixelRatio: 1 / displayScale });

  // Restore
  stage.width(origStageW);
  stage.height(origStageH);
  layer.x(origLayerX);
  layer.y(origLayerY);
  stage.batchDraw();

  return canvas;
}

/**
 * Rotate a canvas 90° clockwise.
 */
function rotateCanvas90CW(src: HTMLCanvasElement): HTMLCanvasElement {
  const dst = document.createElement("canvas");
  dst.width = src.height;
  dst.height = src.width;
  const ctx = dst.getContext("2d")!;
  ctx.translate(dst.width, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src, 0, 0);
  return dst;
}

export function useCanvasExport(stageRef: RefObject<Konva.Stage | null>) {
  const printWidth = usePrinterStore((s) => s.settings.printWidth);
  const labelConfig = useEditorStore((s) => s.labelConfig);

  /** Export label rotated 90° CW and padded to printWidth for printing */
  const exportForPrint = useCallback((): RawImageData | null => {
    const stage = stageRef.current;
    if (!stage) return null;

    const raw = captureLabel(stage, labelConfig.widthPx, labelConfig.heightPx);

    // Rotate 90° CW: editor width → feed length, editor height → print head width
    const canvas = rotateCanvas90CW(raw);
    const rotatedW = canvas.width;
    const rotatedH = canvas.height;

    // Pad to printWidth if narrower than the print head
    if (rotatedW < printWidth) {
      const padded = document.createElement("canvas");
      padded.width = printWidth;
      padded.height = rotatedH;
      const pCtx = padded.getContext("2d")!;
      pCtx.fillStyle = "#ffffff";
      pCtx.fillRect(0, 0, printWidth, rotatedH);
      const offsetX = Math.floor((printWidth - rotatedW) / 2);
      pCtx.drawImage(canvas, offsetX, 0);
      const imgData = pCtx.getImageData(0, 0, printWidth, rotatedH);
      return { data: imgData.data, width: printWidth, height: rotatedH };
    }

    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, rotatedW, rotatedH);
    return { data: imgData.data, width: rotatedW, height: rotatedH };
  }, [stageRef, printWidth, labelConfig]);

  return { exportForPrint };
}

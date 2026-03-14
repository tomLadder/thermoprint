import { useEffect, useRef } from "react";
import type { ImageBitmap1bpp } from "@thermoprint/core";
import { usePrinterStore } from "../store/printer-store.ts";

interface PrintPreviewProps {
  bitmap: ImageBitmap1bpp | null;
  onClose: () => void;
}

function GhostPreview({ width, height }: { width: number; height: number }) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 12,
        flexShrink: 0,
        background: "white",
        opacity: 0.45,
      }}
      className="dark:!bg-gray-600"
    />
  );
}

export function PrintPreview({ bitmap, onClose }: PrintPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const paperType = usePrinterStore((s) => s.settings.paperType);

  useEffect(() => {
    if (!bitmap || !canvasRef.current) return;
    const canvas = canvasRef.current;
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.createImageData(bitmap.width, bitmap.height);
    for (let y = 0; y < bitmap.height; y++) {
      for (let x = 0; x < bitmap.width; x++) {
        const byteIdx = y * bitmap.bytesPerRow + Math.floor(x / 8);
        const bitIdx = 7 - (x % 8);
        const isBlack = (bitmap.data[byteIdx] >> bitIdx) & 1;
        const px = (y * bitmap.width + x) * 4;
        const val = isBlack ? 0 : 255;
        imgData.data[px] = val;
        imgData.data[px + 1] = val;
        imgData.data[px + 2] = val;
        imgData.data[px + 3] = 255;
      }
    }
    ctx.putImageData(imgData, 0, 0);
  }, [bitmap]);

  if (!bitmap) return null;

  const isGap = paperType === "gap";
  const previewScale = 2;
  const displayW = bitmap.width * previewScale;
  const displayH = bitmap.height * previewScale;
  const gapPx = 40;

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold">Print Preview (1-bit)</h3>
        <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 cursor-pointer">Close</button>
      </div>
      <div className="flex justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-6">
        {isGap ? (
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexShrink: 0, position: "relative" }}>
            {/* Backing strip */}
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                height: displayH + 24,
                borderRadius: 4,
              }}
              className="bg-gray-200 dark:bg-gray-700"
            />
            {/* Left ghost */}
            <div style={{ marginRight: gapPx }}>
              <GhostPreview width={displayW} height={displayH} />
            </div>
            {/* Main label */}
            <div style={{ position: "relative", zIndex: 1, borderRadius: 12, overflow: "hidden", flexShrink: 0 }} className="shadow-lg ring-2 ring-blue-400/30">
              <canvas
                ref={canvasRef}
                style={{
                  imageRendering: "pixelated",
                  width: displayW,
                  height: displayH,
                  display: "block",
                }}
              />
            </div>
            {/* Right ghost */}
            <div style={{ marginLeft: gapPx }}>
              <GhostPreview width={displayW} height={displayH} />
            </div>
          </div>
        ) : (
          <div style={{ borderRadius: 12, overflow: "hidden", flexShrink: 0 }} className="shadow-lg">
            <canvas
              ref={canvasRef}
              style={{
                imageRendering: "pixelated",
                width: displayW,
                height: displayH,
                display: "block",
              }}
            />
          </div>
        )}
      </div>
      <div className="mt-2 text-sm text-gray-400 text-center">
        {bitmap.width} x {bitmap.height} px — {bitmap.data.length} bytes
      </div>
    </div>
  );
}

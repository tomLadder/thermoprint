import { useRef, useCallback, useEffect } from "react";
import type Konva from "konva";
import { TopChrome } from "./top-chrome/top-chrome.tsx";
import { Canvas } from "./canvas/canvas.tsx";
import { Inspector } from "./inspector/inspector.tsx";
import { StatusBar } from "./status-bar.tsx";
import { Dock } from "./dock/dock.tsx";
import { PrintProgressToast } from "./print-progress-toast.tsx";
import { Palette } from "./palette/palette.tsx";
import { ConnectFlow } from "./connect-flow/connect-flow.tsx";
import { useKeyboardShortcuts, setPrintFn } from "../lib/keyboard.ts";
import { useEditorV2Store } from "../store/editor-store.ts";
import { usePrinterStore } from "../store/printer-store.ts";
import { getPrinter } from "../hooks/use-web-bluetooth.ts";
import type { RawImageData } from "@thermoprint/core";

function captureLabel(
  stage: Konva.Stage,
  widthPx: number,
  heightPx: number,
): HTMLCanvasElement {
  // The paper+elements layer is the second layer (index 1)
  const layer = stage.getLayers()[1];
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

export function Editor() {
  const stageRef = useRef<Konva.Stage>(null);

  useKeyboardShortcuts();

  // Warn on close with unsaved changes
  useEffect(() => {
    const h = (e: BeforeUnloadEvent) => {
      if (useEditorV2Store.getState().currentLabelDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, []);

  const print = useCallback(async (copies: number): Promise<boolean> => {
    const printer = getPrinter();
    const stage = stageRef.current;

    // Need both a connected printer and a stage to print for real
    if (!printer || !stage) return false;

    const { label } = useEditorV2Store.getState();
    const settings = usePrinterStore.getState().settings;

    // Deselect to avoid selection handles in the capture
    useEditorV2Store.getState().clearSelection();

    // Wait a frame for Konva to re-render without selection handles
    await new Promise((r) => requestAnimationFrame(r));

    // Capture the label region at 1:1 pixel resolution
    const raw = captureLabel(stage, label.widthPx, label.heightPx);
    const canvas = rotateCanvas90CW(raw);
    const rotatedW = canvas.width;
    const rotatedH = canvas.height;

    // Send at the label's natural pixel size — no padding to print head width.
    // The printer handles positioning; padding would 4x the data for narrow labels.
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, rotatedW, rotatedH);
    const imageData: RawImageData = { data: imgData.data, width: rotatedW, height: rotatedH };

    // Listen for real progress events from the printer
    const offProgress = (p: { bytesSent: number; totalBytes: number }) => {
      useEditorV2Store.setState({ printProgress: p });
    };
    printer.on("progress", offProgress);

    try {
      // Send to the real printer
      await printer.print(imageData, {
        density: settings.density,
        paperType: settings.paperType,
        copies,
        dither: settings.ditherMode as "floyd-steinberg" | "threshold" | "none",
        threshold: settings.threshold,
      });
    } finally {
      printer.off("progress", offProgress);
    }

    return true;
  }, []);

  // Register print fn for keyboard shortcut
  useEffect(() => {
    setPrintFn(print);
    return () => setPrintFn(null);
  }, [print]);

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-ink-950 text-ink-100">
      <TopChrome onPrint={print} />
      <div className="relative flex-1 min-h-0 flex flex-col">
        <Canvas ref={stageRef} />
        <Inspector />
        <Dock />
        <PrintProgressToast />
        <StatusBar />
      </div>
      <Palette />
      <ConnectFlow />
    </div>
  );
}

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
import { mmToPx } from "../utils/px-mm.ts";
import { getDevice, type RawImageData } from "@thermoprint/core";

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
  const origScaleX = layer.scaleX();
  const origScaleY = layer.scaleY();

  stage.width(widthPx);
  stage.height(heightPx);
  layer.x(0);
  layer.y(0);
  layer.scaleX(1);
  layer.scaleY(1);

  const canvas = stage.toCanvas({
    x: 0,
    y: 0,
    width: widthPx,
    height: heightPx,
    pixelRatio: 1,
  });

  // Restore
  stage.width(origStageW);
  stage.height(origStageH);
  layer.x(origLayerX);
  layer.y(origLayerY);
  layer.scaleX(origScaleX);
  layer.scaleY(origScaleY);
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

    const { label, printSettings, paperType } = useEditorV2Store.getState();

    // Deselect to avoid selection handles in the capture
    useEditorV2Store.getState().clearSelection();

    // Wait a frame for Konva to re-render without selection handles
    await new Promise((r) => requestAnimationFrame(r));

    const widthDots = mmToPx(label.widthMm);
    const heightDots = mmToPx(label.heightMm);
    const raw = captureLabel(stage, widthDots, heightDots);
    if (raw.width !== widthDots || raw.height !== heightDots) {
      throw new Error(
        `Raster size mismatch: expected ${widthDots}×${heightDots}, got ${raw.width}×${raw.height}`,
      );
    }

    const modelId = usePrinterStore.getState().modelId;
    const profile = modelId ? getDevice(modelId) : null;
    const canvas = profile?.rotateRaster90CW === false
      ? raw
      : rotateCanvas90CW(raw);
    const outputWidth = canvas.width;
    const outputHeight = canvas.height;

    // Send at the label's natural pixel size — no padding to print head width.
    // The printer handles positioning; padding would 4x the data for narrow labels.
    const ctx = canvas.getContext("2d")!;
    const imgData = ctx.getImageData(0, 0, outputWidth, outputHeight);
    const imageData: RawImageData = {
      data: imgData.data,
      width: outputWidth,
      height: outputHeight,
    };

    // Listen for real progress events from the printer
    const offProgress = (p: { bytesSent: number; totalBytes: number }) => {
      useEditorV2Store.setState({ printProgress: p });
    };
    printer.on("progress", offProgress);

    try {
      // Send to the real printer
      await printer.print(imageData, {
        density: printSettings.density,
        paperType,
        copies,
        dither: printSettings.ditherMode as "floyd-steinberg" | "threshold" | "none",
        threshold: printSettings.threshold,
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

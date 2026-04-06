import { useCallback, type RefObject } from "react";
import type Konva from "konva";
import { usePrinterStore } from "../store/printer-store.ts";
import { useEditorStore } from "../store/editor-store.ts";
import { useCanvasExport } from "./use-canvas-export.ts";
import { getPrinter } from "./use-web-bluetooth.ts";

export function usePrinter(stageRef: RefObject<Konva.Stage | null>) {
  const { exportForPrint } = useCanvasExport(stageRef);
  const settings = usePrinterStore((s) => s.settings);

  const print = useCallback(async () => {
    const printer = getPrinter();
    if (!printer) {
      usePrinterStore.getState().setError("No printer connected");
      return;
    }

    useEditorStore.getState().setSelectedId(null);
    const raw = exportForPrint();
    if (!raw) {
      usePrinterStore.getState().setError("Failed to export canvas");
      return;
    }

    usePrinterStore.getState().setPrinting(true);
    usePrinterStore.getState().setError(null);

    try {
      await printer.print(raw, {
        density: settings.density,
        paperType: settings.paperType,
        dither: settings.ditherMode,
        threshold: settings.threshold,
      });
    } catch (err) {
      usePrinterStore.getState().setError(
        err instanceof Error ? err.message : "Print failed",
      );
    } finally {
      usePrinterStore.getState().setPrinting(false);
      usePrinterStore.getState().setPrintProgress(null);
    }
  }, [exportForPrint, settings]);

  return { print };
}

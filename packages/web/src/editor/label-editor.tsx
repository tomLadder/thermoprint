import { useRef } from "react";
import type Konva from "konva";
import { Canvas } from "./canvas.tsx";
import { Toolbar } from "./toolbar/toolbar.tsx";
import { PropertiesPanel } from "./properties/properties-panel.tsx";
import { ElementTree } from "./element-tree.tsx";
import { PrinterPanel } from "../printer/printer-panel.tsx";
import { PrintSettingsPanel } from "../printer/print-settings-panel.tsx";
import { PrintButton } from "../printer/print-button.tsx";
import { TemplateManager } from "../templates/template-manager.tsx";
import { DebugLogButton } from "../printer/debug-log-button.tsx";
import { useKeyboard } from "../hooks/use-keyboard.ts";
import { usePrinter } from "../hooks/use-printer.ts";

export function LabelEditor() {
  const stageRef = useRef<Konva.Stage>(null);
  const { print } = usePrinter(stageRef);

  useKeyboard();

  return (
    <div className="flex flex-col h-screen">
      <Toolbar />
      <div className="flex flex-1 min-h-0">
        <div className="w-60 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-3 flex flex-col gap-4 overflow-y-auto">
          <PrinterPanel />
          <div className="border-t border-gray-200 dark:border-gray-700" />
          <PrintSettingsPanel />
          <div className="border-t border-gray-200 dark:border-gray-700" />
          <PrintButton onPrint={print} />
          <div className="border-t border-gray-200 dark:border-gray-700" />
          <TemplateManager />
          <div className="border-t border-gray-200 dark:border-gray-700" />
          <DebugLogButton />
        </div>
        <Canvas ref={stageRef} />
        <div className="w-56 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
          <ElementTree />
          <div className="border-t border-gray-200 dark:border-gray-700" />
          <PropertiesPanel />
        </div>
      </div>
    </div>
  );
}

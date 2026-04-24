import { useEffect, useRef } from "react";
import { Bluetooth, BatteryFull, BatteryMedium, BatteryLow, X } from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { usePrinterStore } from "../../store/printer-store.ts";
import { useWebBluetooth } from "../../hooks/use-web-bluetooth.ts";
import { getDevice } from "@thermoprint/core";
import { DebugLogSection } from "./debug-log-section.tsx";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  out_of_paper: { label: "Out of paper", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  cover_open: { label: "Cover open", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  overheating: { label: "Overheating", color: "text-red-400 bg-red-400/10 border-red-400/20" },
  low_battery: { label: "Low battery", color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
  cover_closed: { label: "Cover closed", color: "text-ink-300 bg-ink-800 border-white/5" },
};

function StatusBadge({ status }: { status: string | null }) {
  if (!status || status === "cover_closed") {
    return (
      <div className="flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-md bg-emerald-400/10 border border-emerald-400/20 text-ui-sm text-emerald-400 font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        Ready
      </div>
    );
  }
  const info = STATUS_LABELS[status] || { label: status, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" };
  return (
    <div className={`flex items-center gap-1.5 mb-3 px-2 py-1.5 rounded-md border text-ui-sm font-medium ${info.color}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {info.label}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-ink-800 border border-white/5 p-2">
      <div className="text-ui-2xs font-mono uppercase tracking-wider text-ink-400">
        {label}
      </div>
      <div className="text-ui-base font-semibold text-ink-100 mt-0.5">
        {value}
      </div>
    </div>
  );
}

function MiniRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-400">{label}</span>
      <span className="text-ink-200 font-mono">{value}</span>
    </div>
  );
}

export function PrinterChip() {
  const printer = useEditorV2Store((s) => s.printer);
  const printFlyoutOpen = useEditorV2Store((s) => s.printFlyoutOpen);
  const battery = usePrinterStore((s) => s.battery);
  const peripheral = usePrinterStore((s) => s.peripheral);
  const modelId = usePrinterStore((s) => s.modelId);
  const deviceModel = usePrinterStore((s) => s.deviceModel);
  const deviceInfo = usePrinterStore((s) => s.deviceInfo);
  const printerStatus = usePrinterStore((s) => s.printerStatus);
  const { disconnect } = useWebBluetooth();

  const profile = modelId ? getDevice(modelId) : null;
  const ref = useRef<HTMLDivElement>(null);

  // Close flyout on outside click
  useEffect(() => {
    if (!printFlyoutOpen) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        useEditorV2Store.setState({ printFlyoutOpen: false });
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [printFlyoutOpen]);

  const openConnect = () => {
    useEditorV2Store.setState({
      printFlyoutOpen: false,
      connectFlow: { open: true, step: "idle", devices: [], selectedId: null },
    });
  };

  const handleDisconnect = async () => {
    await disconnect();
    useEditorV2Store.setState({
      printer: { connected: false, name: "", battery: 0, model: "" },
      printFlyoutOpen: false,
    });
  };

  if (!printer.connected) {
    return (
      <button
        onClick={openConnect}
        className="flex items-center gap-2 h-8 px-2 md:px-3 rounded-md border border-accent/30 bg-accent/10 text-accent hover:bg-accent/15 hover-fade"
      >
        <Bluetooth size={15} />
        <span className="hidden md:inline text-ui-sm font-semibold">Connect printer</span>
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() =>
          useEditorV2Store.setState((s) => ({
            printFlyoutOpen: !s.printFlyoutOpen,
          }))
        }
        className="group flex items-center gap-2 pl-2 pr-2 md:pr-3 h-8 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 hover-fade"
      >
        <span className="relative flex items-center justify-center w-4 h-4 shrink-0">
          <span className="absolute inset-0 rounded-full bg-emerald-400/20" />
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse" />
        </span>
        {/* Mobile: just the name */}
        <span className="md:hidden text-ui-xs text-ink-100 font-medium truncate max-w-[80px]">
          {printer.name}
        </span>
        {/* Desktop: full info */}
        <div className="hidden md:flex flex-col items-start leading-tight">
          <span className="text-ui-xs font-mono uppercase tracking-wider text-ink-400">
            Connected
          </span>
          <span className="text-ui-sm text-ink-100 font-medium">
            {printer.name}
          </span>
        </div>
        {battery >= 0 && (() => {
          const BatIcon = battery > 60 ? BatteryFull : battery > 20 ? BatteryMedium : BatteryLow;
          const color = battery > 60 ? "text-emerald-400" : battery > 20 ? "text-yellow-400" : "text-red-400";
          return (
            <div className="hidden md:flex items-center gap-1 ml-1 pl-2 border-l border-white/5">
              <BatIcon size={13} className={color} />
              <span className={`text-ui-xs font-mono ${color}`}>
                {battery}%
              </span>
            </div>
          );
        })()}
      </button>

      {printFlyoutOpen && (
        <div className="fixed inset-x-2 top-14 max-h-[80vh] overflow-y-auto md:max-h-none md:overflow-visible md:inset-auto md:absolute md:left-0 md:top-10 md:w-72 bg-ink-850 border border-white/8 rounded-lg shadow-panel p-3 z-[60]">
          <div className="flex items-start justify-between mb-3">
            <div>
              <div className="text-ui-xs font-mono uppercase tracking-wider text-ink-400">
                Printer
              </div>
              <div className="text-sm font-semibold text-ink-50">
                {printer.name}
              </div>
              {peripheral && (
                <div className="text-ui-sm text-ink-300 mt-0.5 font-mono">
                  ID {peripheral.id.slice(0, 17)}
                </div>
              )}
            </div>
            <button
              onClick={() =>
                useEditorV2Store.setState({ printFlyoutOpen: false })
              }
              className="text-ink-400 hover:text-ink-100"
            >
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Metric
              label="Battery"
              value={battery >= 0 ? `${battery}%` : "—"}
            />
            <Metric label="Model" value={deviceModel || printer.model || "—"} />
            <Metric label="Protocol" value={profile?.protocolId?.toUpperCase() || "—"} />
          </div>
          <StatusBadge status={printerStatus} />
          <div className="space-y-1.5 text-ui-sm">
            {deviceInfo.firmware && <MiniRow label="Firmware" value={deviceInfo.firmware} />}
            {deviceInfo.serial && <MiniRow label="Serial" value={deviceInfo.serial} />}
            {deviceInfo.mac && <MiniRow label="MAC" value={deviceInfo.mac} />}
            {deviceInfo.btVersion && <MiniRow label="BT module" value={deviceInfo.btVersion} />}
            {deviceInfo.btName && <MiniRow label="BT name" value={deviceInfo.btName} />}
            {deviceInfo.speed && <MiniRow label="Speed" value={deviceInfo.speed} />}
          </div>
          <DebugLogSection />
          <div className="mt-3 pt-3 border-t border-white/5">
            <button
              onClick={handleDisconnect}
              className="w-full h-7 rounded-md bg-ink-800 hover:bg-ink-750 border border-white/5 text-ui-sm text-ink-300"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

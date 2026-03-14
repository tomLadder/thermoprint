import { Bluetooth, BluetoothOff, Battery, Loader2 } from "lucide-react";
import { usePrinterStore } from "../store/printer-store.ts";
import { useWebBluetooth } from "../hooks/use-web-bluetooth.ts";

export function PrinterPanel() {
  const { peripheral, isConnected, isConnecting, isScanning, battery, error } = usePrinterStore();
  const { scan, connect, disconnect } = useWebBluetooth();

  const handleScan = async () => {
    await scan();
    const p = usePrinterStore.getState().peripheral;
    if (p && !usePrinterStore.getState().isConnected) {
      await connect(p);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold uppercase text-gray-400 tracking-wider">Printer</h3>
      {isConnected ? (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-1.5 text-sm">
            <Bluetooth size={14} className="text-blue-500" />
            <span className="truncate">{peripheral?.name ?? "Connected"}</span>
          </div>
          {battery >= 0 && (
            <div className="flex items-center gap-1.5 text-sm text-gray-500">
              <Battery size={12} />
              <span>{battery}%</span>
            </div>
          )}
          <button onClick={disconnect}
            className="px-2 py-1 text-sm rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            Disconnect
          </button>
        </div>
      ) : (
        <button onClick={handleScan} disabled={isScanning || isConnecting}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
          {isScanning || isConnecting ? <Loader2 size={14} className="animate-spin" /> : <BluetoothOff size={14} />}
          {isScanning ? "Scanning..." : isConnecting ? "Connecting..." : "Connect Printer"}
        </button>
      )}
      {error && <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded p-1.5">{error}</div>}
    </div>
  );
}

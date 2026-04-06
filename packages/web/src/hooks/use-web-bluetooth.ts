import { useCallback } from "react";
import { Printer, findDeviceByName, type BlePeripheral } from "@thermoprint/core";
import { WebBluetoothTransport } from "../transport/web-bluetooth.ts";
import { usePrinterStore, applyModelDefaults } from "../store/printer-store.ts";

// Module-level singletons so all callers share the same transport + printer instance
const transport = new WebBluetoothTransport();
let printer: Printer | null = null;

export function getPrinter(): Printer | null {
  return printer;
}

export function useWebBluetooth() {
  const store = usePrinterStore;

  const scan = useCallback(async () => {
    store.getState().setScanning(true);
    store.getState().setError(null);
    try {
      await transport.scan((peripheral) => {
        store.getState().setPeripheral(peripheral);
        store.getState().setScanning(false);
      });
    } catch (err) {
      store.getState().setError(err instanceof Error ? err.message : "Scan failed");
      store.getState().setScanning(false);
    }
  }, [store]);

  const connect = useCallback(async (peripheral: BlePeripheral) => {
    store.getState().setConnecting(true);
    store.getState().setError(null);
    try {
      printer = await Printer.connect(transport, peripheral);

      printer.on("disconnected", () => {
        store.getState().setConnected(false);
        printer = null;
      });

      printer.on("progress", (p) => {
        store.getState().setPrintProgress(p);
      });

      store.getState().setConnected(true);
      store.getState().setConnecting(false);

      const profile = findDeviceByName(peripheral.name);
      if (profile) {
        store.getState().setModelId(profile.modelId);
        store.setState({ autoDetectedModelId: profile.modelId });
        applyModelDefaults(profile.modelId);
      }

      try {
        const battery = await printer.getBattery();
        store.getState().setBattery(battery);
      } catch {
        // Non-critical
      }
    } catch (err) {
      store.getState().setError(err instanceof Error ? err.message : "Connection failed");
      store.getState().setConnecting(false);
    }
  }, [store]);

  const disconnect = useCallback(async () => {
    if (printer) {
      await printer.disconnect();
      printer = null;
    }
    store.getState().setConnected(false);
  }, [store]);

  return { scan, connect, disconnect };
}

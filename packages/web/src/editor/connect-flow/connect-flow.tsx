import { useEffect, useCallback, useRef } from "react";
import { Bluetooth, X, Check } from "lucide-react";
import { useEditorV2Store } from "../../store/editor-store.ts";
import { usePrinterStore } from "../../store/printer-store.ts";
import { useWebBluetooth } from "../../hooks/use-web-bluetooth.ts";
import { getDevice } from "@thermoprint/core";
import { mmToPx } from "../../utils/px-mm.ts";

type Step = "idle" | "scanning" | "pairing" | "connected" | "error";

function useConnectFlowStep(): Step {
  const cfStep = useEditorV2Store((s) => s.connectFlow.step);
  return cfStep;
}

function setFlow(patch: Partial<{ open: boolean; step: Step }>) {
  useEditorV2Store.setState((s) => ({
    connectFlow: { ...s.connectFlow, ...patch },
  }));
}

export function ConnectFlow() {
  const open = useEditorV2Store((s) => s.connectFlow.open);
  const step = useConnectFlowStep();
  const { scan, connect } = useWebBluetooth();

  // Bridge printer store state into editor store
  const isConnected = usePrinterStore((s) => s.isConnected);
  const isConnecting = usePrinterStore((s) => s.isConnecting);
  const peripheral = usePrinterStore((s) => s.peripheral);
  const battery = usePrinterStore((s) => s.battery);
  const error = usePrinterStore((s) => s.error);

  // Sync printer store → editorV2Store (connection + device profile defaults)
  useEffect(() => {
    if (isConnected && peripheral) {
      useEditorV2Store.setState({
        printer: {
          connected: true,
          name: peripheral.name || "Printer",
          battery: battery >= 0 ? battery : 0,
          model: peripheral.name?.split(" ")[1] || "",
        },
      });

      // Apply device profile defaults to label size and paper type
      const modelId = usePrinterStore.getState().modelId;
      if (modelId) {
        const profile = getDevice(modelId);
        const lc = profile?.labelConfig;
        if (lc) {
          const def = lc.defaultSize;
          useEditorV2Store.setState({
            paperType: lc.defaultPaperType,
            label: {
              widthMm: def.widthMm,
              heightMm: def.heightMm,
              widthPx: mmToPx(def.widthMm),
              heightPx: mmToPx(def.heightMm),
            },
            printSettings: {
              ...useEditorV2Store.getState().printSettings,
              density: profile.defaults.density,
            },
          });
        }
      }

      setFlow({ step: "connected" });
      // Auto-dismiss after 1.2s
      const t = setTimeout(() => setFlow({ open: false, step: "idle" }), 1200);
      return () => clearTimeout(t);
    }
  }, [isConnected, peripheral, battery]);

  useEffect(() => {
    if (isConnecting) {
      setFlow({ step: "pairing" });
    }
  }, [isConnecting]);

  useEffect(() => {
    if (error && step !== "idle") {
      setFlow({ step: "error" });
    }
  }, [error, step]);

  // Sync disconnection
  useEffect(() => {
    if (!isConnected) {
      useEditorV2Store.setState((s) => ({
        printer: { ...s.printer, connected: false },
      }));
    }
  }, [isConnected]);

  // Keep battery in sync (it arrives asynchronously after connect)
  useEffect(() => {
    if (isConnected && battery >= 0) {
      useEditorV2Store.setState((s) => ({
        printer: { ...s.printer, battery },
      }));
    }
  }, [isConnected, battery]);

  const handleScan = useCallback(async () => {
    setFlow({ step: "scanning" });
    try {
      // requestDevice opens native picker — blocks until user selects or cancels
      await scan();
      // After scan resolves, peripheral is set in printer store
      // Auto-connect
      const p = usePrinterStore.getState().peripheral;
      if (p) {
        setFlow({ step: "pairing" });
        await connect(p);
      }
    } catch {
      // User cancelled the native picker — close the whole flow
      setFlow({ open: false, step: "idle" });
    }
  }, [scan, connect]);

  // Auto-trigger scan when the flow opens at "idle" step
  const prevStepRef = useRef<Step>("idle");
  const didAutoScan = useRef(false);
  useEffect(() => {
    // Reset guard when flow closes or when returning to idle from error/other steps
    if (!open) {
      didAutoScan.current = false;
    } else if (step === "idle" && prevStepRef.current !== "idle") {
      didAutoScan.current = false;
    }
    prevStepRef.current = step;

    if (open && step === "idle" && !didAutoScan.current) {
      didAutoScan.current = true;
      handleScan();
    }
  }, [open, step, handleScan]);

  const close = () => setFlow({ open: false, step: "idle" });

  if (!open) return null;

  const printerName = usePrinterStore.getState().peripheral?.name || "Printer";
  const printerBattery = usePrinterStore.getState().battery;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-[2px] flex items-center justify-center"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="w-full max-w-[560px] mx-4 bg-ink-850 border border-white/10 rounded-xl shadow-panel overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center shrink-0">
              <Bluetooth size={18} className="text-accent" />
            </div>
            <div>
              <div className="text-ui-lg font-semibold text-ink-50">
                Connect printer
              </div>
              <div className="text-ui-sm text-ink-400 mt-0.5">
                {step === "idle" &&
                  "Pair a thermal printer over Bluetooth to start printing."}
                {step === "scanning" &&
                  "Select your printer from the browser's Bluetooth picker…"}
                {step === "pairing" &&
                  "Establishing connection. This usually takes a few seconds."}
                {step === "connected" && "All set."}
                {step === "error" && (error || "Something went wrong.")}
              </div>
            </div>
          </div>
          <button
            onClick={close}
            className="text-ink-400 hover:text-ink-100"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body: Idle */}
        {step === "idle" && (
          <div className="px-5 pb-4">
            <div className="rounded-lg border border-white/5 bg-ink-800/50 p-4">
              <div className="text-ui-sm text-ink-400 font-mono uppercase tracking-wider mb-3">
                Before you begin
              </div>
              <ol className="space-y-2.5">
                {[
                  "Power on the printer and hold the power button until the LED blinks blue.",
                  "Make sure Bluetooth is enabled on this device.",
                  "Keep the printer within 3 meters of this device.",
                ].map((t, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-3 text-ui-base text-ink-200"
                  >
                    <div className="w-4 h-4 rounded-full bg-ink-700 border border-white/5 flex items-center justify-center text-ui-xs font-mono text-ink-300 shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span>{t}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-ui-sm text-ink-500">
                Uses <span className="text-ink-200">Web Bluetooth</span>.
                Chrome, Edge, or Opera.
              </div>
              <button
                onClick={handleScan}
                className="flex items-center gap-2 h-9 px-4 rounded-md bg-accent text-on-accent font-semibold text-ui-base hover:bg-accent-600 shadow-[0_0_16px_-4px_color-mix(in_srgb,var(--color-accent)_50%,transparent)]"
              >
                <Bluetooth size={15} />
                Start scanning
              </button>
            </div>
          </div>
        )}

        {/* Body: Scanning / Pairing */}
        {(step === "scanning" || step === "pairing") && (
          <div className="px-5 pb-4">
            <div className="rounded-lg border border-white/5 bg-ink-800/50 overflow-hidden">
              <div className="flex items-center justify-between px-3 h-9 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <div className="relative w-2 h-2">
                    <span className="absolute inset-0 rounded-full bg-accent/40 animate-ping" />
                    <span className="absolute inset-0 rounded-full bg-accent" />
                  </div>
                  <span className="text-ui-sm font-mono uppercase tracking-wider text-ink-300">
                    {step === "pairing" ? "Pairing" : "Waiting for selection"}
                  </span>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center py-10 text-ink-500">
                {step === "scanning" && (
                  <>
                    <div className="relative w-10 h-10 mb-3">
                      <div className="absolute inset-0 rounded-full border border-accent/20 animate-ping" />
                      <div className="absolute inset-2 rounded-full border border-accent/30" />
                      <div className="absolute inset-4 rounded-full bg-accent/80" />
                    </div>
                    <div className="text-ui-base">
                      Choose your printer from the browser dialog…
                    </div>
                    <div className="text-ui-xs text-ink-500 mt-1">
                      The native Bluetooth picker should be open
                    </div>
                  </>
                )}
                {step === "pairing" && (
                  <>
                    <div className="w-8 h-8 mb-3 rounded-full border-2 border-accent/20 border-t-accent animate-spin" />
                    <div className="text-ui-base text-ink-200">
                      Connecting to{" "}
                      <span className="text-accent font-medium">
                        {peripheral?.name || "device"}
                      </span>
                      …
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-ui-xs text-ink-500">
              <span>
                Tip: hold power for 3s to put the printer in pairing mode.
              </span>
              <span className="font-mono">BLE · 2.4GHz</span>
            </div>
          </div>
        )}

        {/* Body: Connected */}
        {step === "connected" && (
          <div className="px-5 pb-5">
            <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center">
                <Check size={18} className="text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="text-ui-md font-semibold text-ink-50">
                  Connected to {printerName}
                </div>
                <div className="text-ui-sm text-ink-400 mt-0.5">
                  Ready to print
                  {printerBattery >= 0 && ` · battery ${printerBattery}%`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Body: Error */}
        {step === "error" && (
          <div className="px-5 pb-4">
            <div className="rounded-lg border border-red-400/20 bg-red-400/5 p-4">
              <div className="text-ui-md font-semibold text-red-300">
                Connection failed
              </div>
              <div className="text-ui-sm text-ink-400 mt-1">
                {error || "Unknown error. Try again."}
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setFlow({ step: "idle" })}
                className="flex items-center gap-2 h-8 px-4 rounded-md bg-ink-800 border border-white/5 text-ink-200 text-ui-base hover:bg-ink-750"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        {step !== "connected" && (
          <div className="flex items-center justify-between px-5 h-9 border-t border-white/5 bg-ink-900/50">
            <div className="flex items-center gap-3 text-ui-xs text-ink-500">
              <span className="flex items-center gap-1.5">
                <Bluetooth size={10} /> Web Bluetooth
              </span>
            </div>
            <button
              onClick={close}
              className="text-ui-sm text-ink-400 hover:text-ink-100"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

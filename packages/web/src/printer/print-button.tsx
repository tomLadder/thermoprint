import { Printer, Loader2 } from "lucide-react";
import { usePrinterStore } from "../store/printer-store.ts";

interface PrintButtonProps {
  onPrint: () => void;
}

export function PrintButton({ onPrint }: PrintButtonProps) {
  const isConnected = usePrinterStore((s) => s.isConnected);
  const isPrinting = usePrinterStore((s) => s.isPrinting);
  const printProgress = usePrinterStore((s) => s.printProgress);

  const progress =
    printProgress && printProgress.totalBytes > 0
      ? Math.round((printProgress.bytesSent / printProgress.totalBytes) * 100)
      : null;

  return (
    <button onClick={onPrint} disabled={!isConnected || isPrinting}
      className="flex items-center justify-center gap-1.5 px-2 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">
      {isPrinting ? (
        <><Loader2 size={14} className="animate-spin" />{progress !== null ? `${progress}%` : "Printing..."}</>
      ) : (
        <><Printer size={14} /> Print</>
      )}
    </button>
  );
}

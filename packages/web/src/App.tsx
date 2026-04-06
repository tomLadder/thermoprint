import { LabelEditor } from "./editor/label-editor.tsx";

function BluetoothUnsupportedBanner() {
  return (
    <div
      style={{
        background: "#dc2626",
        color: "white",
        padding: "12px 16px",
        fontSize: "14px",
        textAlign: "center",
      }}
    >
      Your browser does not support the Web Bluetooth API. This app requires it
      to connect to the printer. Please use a supported browser such as{" "}
      <strong>Google Chrome</strong>, <strong>Microsoft Edge</strong>, or{" "}
      <strong>Opera</strong> on desktop, or <strong>Chrome for Android</strong>.
    </div>
  );
}

export function App() {
  const isBluetoothSupported = "bluetooth" in navigator;

  return (
    <>
      {!isBluetoothSupported && <BluetoothUnsupportedBanner />}
      <LabelEditor />
    </>
  );
}

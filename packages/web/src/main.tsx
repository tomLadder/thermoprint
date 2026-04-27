import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
// @ts-expect-error — fontsource variable font CSS import
import "@fontsource-variable/jetbrains-mono";
import "./index.css";
import { App } from "./app.tsx";
import { useEditorV2Store } from "./store/editor-store.ts";

// Apply saved UI scale before first paint
{
  const scale = useEditorV2Store.getState().uiScale;
  if (scale !== 1) {
    document.documentElement.style.setProperty("--ui-scale", String(scale));
  }
}

// Hydrate editor from saved library on boot
{
  const lib = useEditorV2Store.getState().library;
  const cur =
    lib.labels.find((l) => l.id === lib.currentLabelId) ?? lib.labels[0];
  if (cur) {
    useEditorV2Store.setState({
      currentLabelId: cur.id,
      currentLabelName: cur.name,
      currentLabelDirty: false,
      elements: structuredClone(cur.elements),
      label: { ...cur.label },
    });
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

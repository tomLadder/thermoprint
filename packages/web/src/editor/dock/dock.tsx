import { useState, useEffect } from "react";
import {
  Type,
  QrCode,
  Barcode,
  ImageIcon,
  Square,
  Minus,
  Layers,
  Folder,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import { DockBtn } from "./dock-btn.tsx";
import { DockGroup } from "./dock-group.tsx";
import { DockDivider } from "./dock-divider.tsx";
import { Kbd } from "./kbd.tsx";
import {
  addTextEl,
  addQrEl,
  addBarcodeEl,
  addImageEl,
  addRectEl,
  addLineEl,
} from "../../lib/keyboard.ts";
import { LayersFlyout } from "./flyouts/layers-flyout.tsx";
import { LibraryFlyout } from "./flyouts/library-flyout.tsx";
import { PrintSettingsFlyout } from "./flyouts/print-settings-flyout.tsx";

type FlyoutKey = "layers" | "library" | "print" | "more-tools" | null;

export function Dock() {
  const [openFlyout, setOpenFlyout] = useState<FlyoutKey>(null);

  const toggle = (key: Exclude<FlyoutKey, null>) =>
    setOpenFlyout((cur) => (cur === key ? null : key));

  // Close flyout on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFlyout(null);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, []);

  // Listen for "open library" event from file chip menu
  useEffect(() => {
    const h = () => setOpenFlyout("library");
    window.addEventListener("thermoprint:open-library", h);
    return () => window.removeEventListener("thermoprint:open-library", h);
  }, []);

  return (
    <>
      {openFlyout && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => setOpenFlyout(null)}
        />
      )}
      {openFlyout === "layers" && (
        <LayersFlyout onClose={() => setOpenFlyout(null)} />
      )}
      {openFlyout === "library" && (
        <LibraryFlyout onClose={() => setOpenFlyout(null)} />
      )}
      {openFlyout === "print" && (
        <PrintSettingsFlyout onClose={() => setOpenFlyout(null)} />
      )}
      {openFlyout === "more-tools" && (
        <div className="fixed inset-x-2 bottom-20 md:hidden bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel z-40 overflow-hidden">
          <div className="grid grid-cols-4 gap-1 p-2">
            {[
              { icon: Type, label: "Text", fn: addTextEl },
              { icon: QrCode, label: "QR Code", fn: addQrEl },
              { icon: Barcode, label: "Barcode", fn: addBarcodeEl },
              { icon: ImageIcon, label: "Image", fn: addImageEl },
              { icon: Square, label: "Rectangle", fn: addRectEl },
              { icon: Minus, label: "Line", fn: addLineEl },
            ].map((t) => (
              <button
                key={t.label}
                onClick={() => { t.fn(); setOpenFlyout(null); }}
                className="flex flex-col items-center gap-1 py-3 rounded-lg text-ink-200 hover:bg-ink-800 hover:text-ink-50 hover-fade"
              >
                <t.icon size={20} />
                <span className="text-ui-2xs font-medium">{t.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="absolute bottom-2 md:bottom-10 left-1/2 -translate-x-1/2 z-30">
        <div className="relative">
          {/* Ambient cyan glow */}
          <div
            className="absolute -inset-2 bg-accent/10 blur-2xl opacity-60 pointer-events-none rounded-3xl"
            aria-hidden
          />

          {/* Dock surface */}
          <div
            className="relative flex items-center gap-0.5 pt-2 md:pt-3 pb-1.5 md:pb-2 px-1.5 md:px-2 rounded-2xl border border-ink-700/50 bg-ink-900/95 backdrop-blur-sm shadow-dock"
          >
            {/* Desktop: all tools */}
            <div className="hidden md:contents">
              <DockGroup label="Add">
                <DockBtn icon={Type} label="Text" shortcut="T" onClick={addTextEl} />
                <DockBtn icon={QrCode} label="QR" shortcut="Q" onClick={addQrEl} />
                <DockBtn icon={Barcode} label="Barcode" shortcut="B" onClick={addBarcodeEl} />
                <DockBtn icon={ImageIcon} label="Image" shortcut="I" onClick={addImageEl} />
                <DockBtn icon={Square} label="Rect" shortcut="R" onClick={addRectEl} />
                <DockBtn icon={Minus} label="Line" shortcut="L" onClick={addLineEl} />
              </DockGroup>
              <DockDivider />
            </div>

            {/* Mobile: Text + Image + More */}
            <div className="md:hidden contents">
              <DockGroup label="Add">
                <DockBtn icon={Type} label="Text" onClick={addTextEl} />
                <DockBtn icon={ImageIcon} label="Image" onClick={addImageEl} />
                <DockBtn
                  icon={MoreHorizontal}
                  label="More"
                  onClick={() => toggle("more-tools")}
                  active={openFlyout === "more-tools"}
                />
              </DockGroup>
              <DockDivider />
            </div>

            <DockGroup label="Panels">
              <DockBtn
                icon={Layers}
                label="Layers"
                onClick={() => toggle("layers")}
                active={openFlyout === "layers"}
              />
              <DockBtn
                icon={Folder}
                label="Library"
                onClick={() => toggle("library")}
                active={openFlyout === "library"}
              />
              <DockBtn
                icon={Settings}
                label="Settings"
                onClick={() => toggle("print")}
                active={openFlyout === "print"}
              />
            </DockGroup>
          </div>
        </div>

        {/* Shortcut legend */}
        <div className="hidden md:flex items-center justify-center gap-3 mt-3 text-ui-xs font-mono text-ink-400 uppercase tracking-wider">
          <span>
            <Kbd>Space</Kbd> pan
          </span>
          <span className="text-ink-700">•</span>
          <span>
            <Kbd>⌘</Kbd>+<Kbd>scroll</Kbd> zoom
          </span>
          <span className="text-ink-700">•</span>
          <span>
            <Kbd>⌘K</Kbd> commands
          </span>
        </div>
      </div>
    </>
  );
}

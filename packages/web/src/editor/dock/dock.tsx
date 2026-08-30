import { useState, useEffect } from "react";
import {
  Type,
  QrCode,
  Barcode,
  ImageIcon,
  Sticker,
  Square,
  Minus,
  Layers,
  Folder,
  Settings,
  MoreHorizontal,
  CalendarClock,
} from "lucide-react";
import { DockBtn } from "./dock-btn.tsx";
import { DockGroup } from "./dock-group.tsx";
import { DockDivider } from "./dock-divider.tsx";
import { Kbd } from "./kbd.tsx";
import { useEditorV2Store } from "../../store/editor-store.ts";
import {
  addTextEl,
  addQrEl,
  addBarcodeEl,
  addImageEl,
  addRectEl,
  addLineEl,
  addDateEl,
} from "../../lib/keyboard.ts";
import { LayersFlyout } from "./flyouts/layers-flyout.tsx";
import { LibraryFlyout } from "./flyouts/library-flyout.tsx";
import { PrintSettingsFlyout } from "./flyouts/print-settings-flyout.tsx";
import { IconsFlyout } from "./flyouts/icons-flyout.tsx";

type FlyoutKey = "layers" | "library" | "print" | "icons" | "more-tools" | null;

interface ReplaceIconDetail {
  initialPrefix?: string | null;
  targetElementId?: string | null;
}

export function Dock() {
  const [openFlyout, setOpenFlyout] = useState<FlyoutKey>(null);
  const [replaceDetail, setReplaceDetail] = useState<ReplaceIconDetail | null>(
    null
  );

  const toggle = (key: Exclude<FlyoutKey, null>) => {
    setReplaceDetail(null);
    setOpenFlyout((cur) => (cur === key ? null : key));
  };

  // Close flyout on Escape
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenFlyout(null);
        setReplaceDetail(null);
      }
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

  // Listen for "open icons" & "replace icon" events
  useEffect(() => {
    const handleOpenIcons = (e: Event) => {
      const customEvent = e as CustomEvent<ReplaceIconDetail>;
      setReplaceDetail(customEvent.detail || null);
      setOpenFlyout("icons");
    };
    window.addEventListener("thermoprint:open-icons", handleOpenIcons);
    return () =>
      window.removeEventListener("thermoprint:open-icons", handleOpenIcons);
  }, []);

  return (
    <>
      {openFlyout && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => {
            setOpenFlyout(null);
            setReplaceDetail(null);
          }}
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
      {openFlyout === "icons" && (
        <IconsFlyout
          onClose={() => {
            setOpenFlyout(null);
            setReplaceDetail(null);
          }}
          initialPrefix={replaceDetail?.initialPrefix}
          targetElementId={replaceDetail?.targetElementId}
        />
      )}
      {openFlyout === "more-tools" && (
        <div className="fixed inset-x-2 bottom-20 md:hidden bg-ink-850/95 backdrop-blur-sm border border-white/8 rounded-lg shadow-panel z-40 overflow-hidden">
          <div className="grid grid-cols-4 gap-1 p-2">
            {[
              { icon: Type, label: "Text", fn: addTextEl },
              { icon: CalendarClock, label: "Date", fn: addDateEl },
              { icon: QrCode, label: "QR Code", fn: addQrEl },
              { icon: Barcode, label: "Barcode", fn: addBarcodeEl },
              { icon: ImageIcon, label: "Image", fn: addImageEl },
              { icon: Sticker, label: "Icons", fn: () => setOpenFlyout("icons") },
              { icon: Square, label: "Rectangle", fn: addRectEl },
              { icon: Minus, label: "Line", fn: addLineEl },
            ].map((t) => (
              <button
                key={t.label}
                onClick={() => {
                  t.fn();
                  if (t.label !== "Icons") setOpenFlyout(null);
                }}
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
                <DockBtn icon={CalendarClock} label="Date" shortcut="D" onClick={addDateEl} />
                <DockBtn icon={QrCode} label="QR" shortcut="Q" onClick={addQrEl} />
                <DockBtn icon={Barcode} label="Barcode" shortcut="B" onClick={addBarcodeEl} />
                <DockBtn icon={ImageIcon} label="Image" shortcut="I" onClick={addImageEl} />
                <DockBtn
                  icon={Sticker}
                  label="Icons"
                  shortcut="C"
                  onClick={() => toggle("icons")}
                  active={openFlyout === "icons"}
                />
                <DockBtn icon={Square} label="Rect" shortcut="R" onClick={addRectEl} />
                <DockBtn icon={Minus} label="Line" shortcut="L" onClick={addLineEl} />
              </DockGroup>
              <DockDivider />
            </div>

            {/* Mobile: Text + Image + Icons + More */}
            <div className="md:hidden contents">
              <DockGroup label="Add">
                <DockBtn icon={Type} label="Text" onClick={addTextEl} />
                <DockBtn icon={ImageIcon} label="Image" onClick={addImageEl} />
                <DockBtn
                  icon={Sticker}
                  label="Icons"
                  onClick={() => toggle("icons")}
                  active={openFlyout === "icons"}
                />
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
          <button
            onClick={() => useEditorV2Store.setState({ paletteOpen: true })}
            className="hover:text-accent hover-fade flex items-center gap-1 cursor-pointer outline-none"
            title="Click or press ⌘K to open Command Palette"
          >
            <Kbd>⌘K</Kbd> commands
          </button>
        </div>
      </div>
    </>
  );
}

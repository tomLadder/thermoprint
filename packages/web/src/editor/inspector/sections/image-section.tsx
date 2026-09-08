import { Sticker, ImageIcon } from "lucide-react";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { Field, ColorInput } from "../fields.tsx";
import { fetchIconWithColorDataUrl } from "../../../lib/iconify.ts";

interface Props {
  element: BaseElement;
}

export function ImageSection({ element }: Props) {
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const isIcon = Boolean(element.props.iconName);
  const iconName = (element.props.iconName as string) || "";
  const collectionName = (element.props.collectionName as string) || "";
  const collectionPrefix = (element.props.collection as string) || null;
  const iconFill = (element.props.fill as string) || "#000000";

  const handleReplaceIcon = () => {
    window.dispatchEvent(
      new CustomEvent("thermoprint:open-icons", {
        detail: {
          initialPrefix: collectionPrefix,
          targetElementId: element.id,
        },
      })
    );
  };

  const handleReplaceImageFile = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const { label } = useEditorV2Store.getState();
          const maxW = Math.min(200, label.widthPx * 0.8);
          const maxH = Math.min(200, label.heightPx * 0.8);
          let w = img.naturalWidth;
          let h = img.naturalHeight;

          if (w > maxW || h > maxH) {
            const ratio = Math.min(maxW / w, maxH / h);
            w = Math.round(w * ratio);
            h = Math.round(h * ratio);
          }

          updateElement(element.id, {
            width: w,
            height: h,
            props: {
              src: reader.result as string,
              naturalWidth: img.naturalWidth,
              naturalHeight: img.naturalHeight,
            },
          });
        };
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleColorChange = async (newColor: string) => {
    if (!isIcon) return;
    try {
      const dataUrl = await fetchIconWithColorDataUrl(iconName, newColor);
      updateElement(element.id, {
        props: {
          ...element.props,
          fill: newColor,
          src: dataUrl,
        },
      });
    } catch {
      updateElement(element.id, {
        props: {
          ...element.props,
          fill: newColor,
        },
      });
    }
  };

  return (
    <div className="p-3 border-b border-white/5 space-y-3">
      <div className="text-ui-xs font-semibold text-ink-400 uppercase tracking-wider">
        {isIcon ? "Icon Properties" : "Image Properties"}
      </div>

      {isIcon && (
        <div className="space-y-2">
          <Field label="Name">
            <span className="font-mono text-ink-100 text-ui-sm font-medium truncate block max-w-[150px]">
              {iconName}
            </span>
          </Field>

          {collectionName && (
            <Field label="Collection">
              <span className="text-ink-200 text-ui-sm font-medium truncate block max-w-[150px]">
                {collectionName}
              </span>
            </Field>
          )}

          <div className="pt-1">
            <Field label="Color">
              <ColorInput
                value={iconFill}
                onChange={handleColorChange}
              />
            </Field>
          </div>
        </div>
      )}

      <div className="space-y-2 pt-1">
        <button
          onClick={handleReplaceIcon}
          className="w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-ink-800 border border-white/10 text-ink-200 hover:text-ink-50 hover:bg-ink-750 text-ui-sm font-medium transition-colors"
        >
          <Sticker size={13} />
          <span>Replace with Icon</span>
        </button>
        <button
          onClick={handleReplaceImageFile}
          className="w-full flex items-center justify-center gap-1.5 h-8 px-3 rounded-md bg-ink-800 border border-white/10 text-ink-200 hover:text-ink-50 hover:bg-ink-750 text-ui-sm font-medium transition-colors"
        >
          <ImageIcon size={13} />
          <span>Replace with Image File</span>
        </button>
      </div>
    </div>
  );
}

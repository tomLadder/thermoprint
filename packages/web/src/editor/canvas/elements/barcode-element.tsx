import { useEffect, useState, useMemo, useRef } from "react";
import { Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import JsBarcode from "jsbarcode";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function BarcodeElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Image>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const selectOnly = useEditorV2Store((s) => s.selectOnly);

  const p = element.props as {
    content?: string;
    format?: string;
    displayValue?: boolean;
  };

  const cacheKey = useMemo(
    () => `${p.content || ""}|${p.format || "CODE128"}|${p.displayValue}|${element.width}|${element.height}`,
    [p.content, p.format, p.displayValue, element.width, element.height],
  );

  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    try {
      const showVal = p.displayValue ?? true;
      const fontSz = showVal
        ? Math.max(9, Math.min(18, Math.round(element.height * 0.22)))
        : 0;
      const barH = Math.max(12, Math.round(element.height - (showVal ? fontSz + 8 : 4)));

      // Measure natural module width using a 1px test render
      const testCanvas = document.createElement("canvas");
      JsBarcode(testCanvas, p.content || "1234567890", {
        format: p.format || "CODE128",
        displayValue: false,
        margin: 2,
        width: 1,
        height: 10,
      });

      const modules = testCanvas.width > 4 ? testCanvas.width - 4 : 100;
      const targetBarWidth = Math.max(1, Math.min(6, (element.width - 6) / modules));

      const canvas = document.createElement("canvas");
      JsBarcode(canvas, p.content || "1234567890", {
        format: p.format || "CODE128",
        displayValue: showVal,
        fontSize: fontSz,
        textMargin: 1,
        margin: 2,
        width: targetBarWidth,
        height: barH,
        background: "#ffffff",
        lineColor: "#000000",
      });
      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => setImage(img);
    } catch {
      // Invalid barcode content for format
    }
  }, [cacheKey]);

  if (!image) {
    return (
      <Rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill="#f0f0f0"
        stroke="#ccc"
        strokeWidth={1}
      />
    );
  }

  return (
    <>
      <KonvaImage
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        image={image}
        draggable
        onClick={() => selectOnly([element.id])}
        onTap={() => selectOnly([element.id])}
        onDragEnd={(e) => {
          updateElement(element.id, { x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = ref.current;
          if (!node) return;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();
          node.scaleX(1);
          node.scaleY(1);
          updateElement(element.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      <ElementWrapper nodeRef={ref} isSelected={isSelected} />
    </>
  );
}

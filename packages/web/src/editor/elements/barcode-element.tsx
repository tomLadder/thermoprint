import { useRef, useEffect, useState } from "react";
import { Image } from "react-konva";
import type Konva from "konva";
import JsBarcode from "jsbarcode";
import type { EditorElement, BarcodeProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface BarcodeElementProps {
  element: EditorElement;
  isSelected: boolean;
}

export function BarcodeElement({ element, isSelected }: BarcodeElementProps) {
  const ref = useRef<Konva.Image>(null);
  const props = element.props as BarcodeProps;
  const updateElement = useEditorStore((s) => s.updateElement);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      JsBarcode(canvas, props.content || "0000", {
        format: props.format,
        displayValue: props.displayValue,
        margin: 2,
        height: 60,
        background: "#ffffff",
        lineColor: "#000000",
      });
      const img = new window.Image();
      img.src = canvas.toDataURL();
      img.onload = () => setImage(img);
    } catch {
      // Invalid barcode content for format
    }
  }, [props.content, props.format, props.displayValue]);

  if (!image) return null;

  return (
    <>
      <Image
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        image={image}
        draggable
        onClick={() => setSelectedId(element.id)}
        onTap={() => setSelectedId(element.id)}
        onDragStart={() => pushHistory()}
        onDragEnd={(e) => {
          updateElement(element.id, { x: e.target.x(), y: e.target.y() });
        }}
        onTransformEnd={() => {
          const node = ref.current;
          if (!node) return;
          pushHistory();
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

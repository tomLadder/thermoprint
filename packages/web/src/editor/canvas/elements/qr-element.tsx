import { useEffect, useState, useMemo, useRef } from "react";
import { Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import QRCode from "qrcode";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function QrElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Image>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const selectOnly = useEditorV2Store((s) => s.selectOnly);

  const p = element.props as {
    content?: string;
    errorCorrectionLevel?: string;
  };

  const cacheKey = useMemo(
    () => `${p.content || ""}|${p.errorCorrectionLevel || "M"}`,
    [p.content, p.errorCorrectionLevel],
  );

  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(
      canvas,
      p.content || " ",
      {
        errorCorrectionLevel:
          (p.errorCorrectionLevel as "L" | "M" | "Q" | "H") || "M",
        margin: 1,
        scale: 4,
        color: { dark: "#000000", light: "#ffffff" },
      },
      (err) => {
        if (err) return;
        const img = new window.Image();
        img.src = canvas.toDataURL();
        img.onload = () => setImage(img);
      },
    );
  }, [cacheKey, p.content, p.errorCorrectionLevel]);

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

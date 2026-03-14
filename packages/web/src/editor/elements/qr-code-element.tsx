import { useRef, useEffect, useState } from "react";
import { Image } from "react-konva";
import type Konva from "konva";
import QRCode from "qrcode";
import type { EditorElement, QrCodeProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface QrCodeElementProps {
  element: EditorElement;
  isSelected: boolean;
}

export function QrCodeElement({ element, isSelected }: QrCodeElementProps) {
  const ref = useRef<Konva.Image>(null);
  const props = element.props as QrCodeProps;
  const updateElement = useEditorStore((s) => s.updateElement);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    const canvas = document.createElement("canvas");
    QRCode.toCanvas(
      canvas,
      props.content || " ",
      {
        errorCorrectionLevel: props.errorCorrectionLevel,
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
  }, [props.content, props.errorCorrectionLevel]);

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

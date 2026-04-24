import { useRef } from "react";
import { Rect } from "react-konva";
import type Konva from "konva";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function RectElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Rect>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const selectOnly = useEditorV2Store((s) => s.selectOnly);

  const p = element.props as {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
  };

  return (
    <>
      <Rect
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        fill={p.fill || "transparent"}
        stroke={p.stroke || "#000000"}
        strokeWidth={p.strokeWidth ?? 2}
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

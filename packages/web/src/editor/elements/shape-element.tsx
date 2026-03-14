import { useRef } from "react";
import { Rect, Line } from "react-konva";
import type Konva from "konva";
import type { EditorElement, ShapeProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface ShapeElementProps {
  element: EditorElement;
  isSelected: boolean;
}

export function ShapeElement({ element, isSelected }: ShapeElementProps) {
  const ref = useRef<Konva.Rect | Konva.Line>(null);
  const props = element.props as ShapeProps;
  const updateElement = useEditorStore((s) => s.updateElement);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);

  const commonProps = {
    id: element.id,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    draggable: true as const,
    onClick: () => setSelectedId(element.id),
    onTap: () => setSelectedId(element.id),
    onDragStart: () => pushHistory(),
    onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
      updateElement(element.id, { x: e.target.x(), y: e.target.y() });
    },
    onTransformEnd: () => {
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
    },
  };

  return (
    <>
      {props.shapeType === "rect" ? (
        <Rect
          ref={ref as React.RefObject<Konva.Rect>}
          {...commonProps}
          width={element.width}
          height={element.height}
          fill={props.fill}
          stroke={props.stroke}
          strokeWidth={props.strokeWidth}
        />
      ) : (
        <Line
          ref={ref as React.RefObject<Konva.Line>}
          {...commonProps}
          points={[0, 0, element.width, element.height]}
          stroke={props.stroke}
          strokeWidth={props.strokeWidth}
        />
      )}
      <ElementWrapper
        nodeRef={ref as React.RefObject<Konva.Node>}
        isSelected={isSelected}
      />
    </>
  );
}

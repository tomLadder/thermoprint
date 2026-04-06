import { useRef, useEffect } from "react";
import { Text } from "react-konva";
import type Konva from "konva";
import type { EditorElement, TextProps } from "../../store/types.ts";
import { useEditorStore } from "../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface TextElementProps {
  element: EditorElement;
  isSelected: boolean;
}

export function TextElement({ element, isSelected }: TextElementProps) {
  const ref = useRef<Konva.Text>(null);
  const props = element.props as TextProps;
  const updateElement = useEditorStore((s) => s.updateElement);
  const updateElementProps = useEditorStore((s) => s.updateElementProps);
  const pushHistory = useEditorStore((s) => s.pushHistory);
  const setSelectedId = useEditorStore((s) => s.setSelectedId);

  // Ensure the font is loaded before measuring, then redraw
  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const measure = () => {
      if (!ref.current) return;
      const h = ref.current.height();
      if (Math.abs(h - element.height) > 1) {
        updateElement(element.id, { height: h });
      }
    };

    document.fonts.load(`16px "${props.fontFamily}"`).then(() => {
      node.getLayer()?.batchDraw();
      requestAnimationFrame(measure);
    });

    requestAnimationFrame(measure);
  }, [props.text, props.fontSize, props.fontFamily, props.fontStyle, element.width]);

  return (
    <>
      <Text
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        rotation={element.rotation}
        text={props.text}
        fontSize={props.fontSize}
        fontFamily={props.fontFamily}
        fontStyle={props.fontStyle || undefined}
        fill={props.fill}
        align={props.align}
        wrap="word"
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
          const newFontSize = Math.max(4, Math.round(props.fontSize * scaleY));
          const newWidth = Math.max(5, node.width() * scaleX);
          updateElement(element.id, {
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: node.height(),
            rotation: node.rotation(),
          });
          updateElementProps(element.id, { fontSize: newFontSize });
        }}
      />
      <ElementWrapper nodeRef={ref} isSelected={isSelected} />
    </>
  );
}

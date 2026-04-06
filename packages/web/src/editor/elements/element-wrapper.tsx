import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";


interface ElementWrapperProps {
  nodeRef: React.RefObject<Konva.Node | null>;
  isSelected: boolean;
}

export function ElementWrapper({ nodeRef, isSelected }: ElementWrapperProps) {
  const trRef = useRef<Konva.Transformer>(null);

  useEffect(() => {
    if (isSelected && trRef.current && nodeRef.current) {
      trRef.current.nodes([nodeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected, nodeRef]);

  if (!isSelected) return null;

  return (
    <Transformer
      ref={trRef}
      rotateEnabled={true}
      boundBoxFunc={(oldBox, newBox) => {
        if (Math.abs(newBox.width) < 5 || Math.abs(newBox.height) < 5) {
          return oldBox;
        }
        return newBox;
      }}
      anchorSize={12}
      anchorCornerRadius={6}
      anchorStroke="#2563eb"
      anchorStrokeWidth={2}
      anchorFill="#ffffff"
      borderStroke="#2563eb"
      borderStrokeWidth={2}
      borderDash={[6, 3]}
      rotateAnchorOffset={32}
      rotateAnchorCursor={"grab"}
      anchorStyleFunc={(anchor: Konva.Shape) => {
        // Make the rotate anchor circular and distinct
        if (anchor.hasName("rotater")) {
          (anchor as unknown as Konva.Rect).cornerRadius(10);
          anchor.fill("#2563eb");
          anchor.stroke("#1d4ed8");
          anchor.width(14);
          anchor.height(14);
          anchor.offsetX(7);
          anchor.offsetY(7);
        }
        // Cursor feedback
        anchor.on("mouseenter", () => {
          const stage = anchor.getStage();
          if (stage) stage.container().style.cursor = anchor.hasName("rotater") ? "grab" : "nwse-resize";
        });
        anchor.on("mouseleave", () => {
          const stage = anchor.getStage();
          if (stage) stage.container().style.cursor = "default";
        });
      }}
    />
  );
}

import { useCallback, useRef } from "react";
import { Group, Rect, Circle } from "react-konva";
import type Konva from "konva";
import {
  useEditorV2Store,
  type BaseElement,
} from "../../store/editor-store.ts";

const ACCENT_MAP: Record<string, string> = {
  cyan: "#2ad0ff",
  amber: "#ff9f40",
  graphite: "#e6e6eb",
  violet: "#a78bfa",
  forest: "#6ecc93",
  paper: "#e2bc7a",
};

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 24;

type HandleAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "middle-left"
  | "middle-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

const HANDLE_POSITIONS: { anchor: HandleAnchor; xFrac: number; yFrac: number }[] = [
  { anchor: "top-left", xFrac: 0, yFrac: 0 },
  { anchor: "top-center", xFrac: 0.5, yFrac: 0 },
  { anchor: "top-right", xFrac: 1, yFrac: 0 },
  { anchor: "middle-left", xFrac: 0, yFrac: 0.5 },
  { anchor: "middle-right", xFrac: 1, yFrac: 0.5 },
  { anchor: "bottom-left", xFrac: 0, yFrac: 1 },
  { anchor: "bottom-center", xFrac: 0.5, yFrac: 1 },
  { anchor: "bottom-right", xFrac: 1, yFrac: 1 },
];

function cursorForAnchor(anchor: HandleAnchor): string {
  const map: Record<HandleAnchor, string> = {
    "top-left": "nwse-resize",
    "top-center": "ns-resize",
    "top-right": "nesw-resize",
    "middle-left": "ew-resize",
    "middle-right": "ew-resize",
    "bottom-left": "nesw-resize",
    "bottom-center": "ns-resize",
    "bottom-right": "nwse-resize",
  };
  return map[anchor];
}

interface Props {
  element: BaseElement;
  zoom: number;
}

export function SelectionHandles({ element, zoom }: Props) {
  const theme = useEditorV2Store((s) => s.theme);
  const accentColor = ACCENT_MAP[theme] || ACCENT_MAP.cyan;
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const dragStart = useRef<{
    anchor: HandleAnchor;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  } | null>(null);

  const handleSize = HANDLE_SIZE / zoom;
  const half = handleSize / 2;

  const onResizeStart = useCallback(
    (anchor: HandleAnchor, e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const stage = e.target.getStage();
      if (!stage) return;

      dragStart.current = {
        anchor,
        startX: e.evt.clientX,
        startY: e.evt.clientY,
        origX: element.x,
        origY: element.y,
        origW: element.width,
        origH: element.height,
      };

      const onMove = (ev: MouseEvent) => {
        if (!dragStart.current) return;
        const d = dragStart.current;
        const dx = (ev.clientX - d.startX) / zoom;
        const dy = (ev.clientY - d.startY) / zoom;

        let newX = d.origX;
        let newY = d.origY;
        let newW = d.origW;
        let newH = d.origH;

        // Horizontal
        if (anchor.includes("left")) {
          newX = d.origX + dx;
          newW = d.origW - dx;
        } else if (anchor.includes("right")) {
          newW = d.origW + dx;
        }

        // Vertical
        if (anchor.includes("top")) {
          newY = d.origY + dy;
          newH = d.origH - dy;
        } else if (anchor.includes("bottom")) {
          newH = d.origH + dy;
        }

        // Enforce minimum size
        const minSize = 8;
        if (newW < minSize) {
          if (anchor.includes("left")) newX = d.origX + d.origW - minSize;
          newW = minSize;
        }
        if (newH < minSize) {
          if (anchor.includes("top")) newY = d.origY + d.origH - minSize;
          newH = minSize;
        }

        updateElement(element.id, {
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      };

      const onUp = () => {
        dragStart.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
      };

      document.body.style.cursor = cursorForAnchor(anchor);
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [element, zoom, updateElement],
  );

  const onRotateStart = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent>) => {
      e.cancelBubble = true;
      const centerX = element.x + element.width / 2;
      const centerY = element.y + element.height / 2;

      const onMove = (ev: MouseEvent) => {
        const stage = e.target.getStage();
        if (!stage) return;
        const pointer = stage.getPointerPosition();
        if (!pointer) return;
        // Convert pointer to label coordinates
        const labelGroup = stage.findOne("#label-group") as Konva.Group | undefined;
        if (!labelGroup) return;
        const transform = labelGroup.getAbsoluteTransform().copy().invert();
        const pos = transform.point(pointer);

        const angle = Math.atan2(pos.y - centerY, pos.x - centerX);
        let deg = (angle * 180) / Math.PI + 90;
        // Snap to 15° increments when shift held
        if (ev.shiftKey) {
          deg = Math.round(deg / 15) * 15;
        }
        updateElement(element.id, { rotation: Math.round(deg) });
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        document.body.style.cursor = "";
      };

      document.body.style.cursor = "grabbing";
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [element, updateElement],
  );

  return (
    <Group
      x={element.x}
      y={element.y}
      rotation={element.rotation}
    >
      {/* Selection outline */}
      <Rect
        width={element.width}
        height={element.height}
        stroke={accentColor}
        strokeWidth={1.5 / zoom}
        listening={false}
      />

      {/* Resize handles */}
      {HANDLE_POSITIONS.map(({ anchor, xFrac, yFrac }) => (
        <Rect
          key={anchor}
          x={xFrac * element.width - half}
          y={yFrac * element.height - half}
          width={handleSize}
          height={handleSize}
          fill="#ffffff"
          stroke={accentColor}
          strokeWidth={1.5 / zoom}
          cornerRadius={2 / zoom}
          onMouseDown={(e) => onResizeStart(anchor, e)}
        />
      ))}

      {/* Rotation handle */}
      <Circle
        x={element.width / 2}
        y={-ROTATION_HANDLE_OFFSET / zoom}
        radius={handleSize / 2}
        fill="#ffffff"
        stroke={accentColor}
        strokeWidth={1.5 / zoom}
        onMouseDown={onRotateStart}
      />
    </Group>
  );
}

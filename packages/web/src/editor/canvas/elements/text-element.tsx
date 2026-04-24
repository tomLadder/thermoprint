import { useRef, useEffect, useCallback } from "react";
import { Text } from "react-konva";
import type Konva from "konva";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function TextElement({ element, isSelected }: Props) {
  const ref = useRef<Konva.Text>(null);
  const updateElement = useEditorV2Store((s) => s.updateElement);
  const selectOnly = useEditorV2Store((s) => s.selectOnly);
  const editingTextId = useEditorV2Store((s) => s.editingTextId);

  const isEditing = editingTextId === element.id;

  const p = element.props as {
    text?: string;
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: number;
    letterSpacing?: number;
    fill?: string;
    align?: string;
    italic?: boolean;
  };

  const fontStyle =
    [p.italic ? "italic" : "", p.fontWeight && p.fontWeight >= 700 ? "bold" : ""]
      .filter(Boolean)
      .join(" ") || "normal";

  // Auto-measure height after font loads
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
    document.fonts.load(`16px "${p.fontFamily || "Inter"}"`).then(() => {
      node.getLayer()?.batchDraw();
      requestAnimationFrame(measure);
    });
    requestAnimationFrame(measure);
  }, [p.text, p.fontSize, p.fontFamily, fontStyle, element.width, element.id, element.height, updateElement]);

  const startEditing = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    const stage = node.getStage();
    if (!stage) return;

    useEditorV2Store.setState({ editingTextId: element.id });

    // Measure position BEFORE hiding
    const absPos = node.getAbsolutePosition();
    const stageContainer = stage.container();
    const stageRect = stageContainer.getBoundingClientRect();
    const scale = node.getAbsoluteScale();

    // Hide the Konva text while editing
    node.hide();
    node.getLayer()?.batchDraw();

    const textarea = document.createElement("textarea");
    textarea.value = p.text || "";
    const borderWidth = 2;
    textarea.style.position = "fixed";
    textarea.style.left = `${stageRect.left + absPos.x - borderWidth}px`;
    textarea.style.top = `${stageRect.top + absPos.y - borderWidth}px`;
    textarea.style.width = `${element.width * scale.x}px`;
    textarea.style.height = `${element.height * scale.y}px`;
    textarea.style.boxSizing = "content-box";
    const scaledFontSize = (p.fontSize || 18) * scale.y;
    textarea.style.fontSize = `${scaledFontSize}px`;
    textarea.style.fontFamily = `'${p.fontFamily || "Inter"}', sans-serif`;
    // Match Konva's fontStyle exactly: "normal", "bold", "italic", or "italic bold"
    const isBold = fontStyle.includes("bold");
    const isItalic = fontStyle.includes("italic");
    textarea.style.fontWeight = isBold ? "bold" : "normal";
    textarea.style.fontStyle = isItalic ? "italic" : "normal";
    textarea.style.letterSpacing = `${(p.letterSpacing || 0) * scale.x}px`;
    textarea.style.color = p.fill || "#000000";
    textarea.style.textAlign = (p.align as string) || "left";
    textarea.style.border = "2px solid var(--color-accent)";
    textarea.style.borderRadius = "2px";
    textarea.style.background = "rgba(255,255,255,0.95)";
    textarea.style.outline = "none";
    textarea.style.padding = "0px";
    textarea.style.margin = "0px";
    textarea.style.resize = "none";
    textarea.style.overflow = "hidden";
    textarea.style.lineHeight = `${node.lineHeight()}`;
    textarea.style.wordBreak = "break-word";
    textarea.style.whiteSpace = "pre-wrap";
    textarea.style.zIndex = "1000";
    textarea.style.transformOrigin = "left top";
    if (element.rotation) {
      textarea.style.transform = `rotate(${element.rotation}deg)`;
    }

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    // Auto-resize height only on input (not on creation to avoid initial growth)
    const autoSize = () => {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    };
    textarea.addEventListener("input", autoSize);

    const commit = () => {
      const newText = textarea.value;
      updateElement(element.id, { props: { text: newText } });
      useEditorV2Store.setState({ editingTextId: null });
      document.body.removeChild(textarea);
      node.show();
      node.getLayer()?.batchDraw();
    };

    textarea.addEventListener("blur", commit);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        // Cancel — restore original text
        textarea.removeEventListener("blur", commit);
        useEditorV2Store.setState({ editingTextId: null });
        document.body.removeChild(textarea);
        node.show();
        node.getLayer()?.batchDraw();
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        textarea.blur();
      }
    });
  }, [element, p, updateElement]);

  return (
    <>
      <Text
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        rotation={element.rotation}
        text={p.text || "Text"}
        fontSize={p.fontSize || 18}
        fontFamily={p.fontFamily || "Inter"}
        fontStyle={fontStyle}
        letterSpacing={p.letterSpacing || 0}
        fill={p.fill || "#000000"}
        align={(p.align as "left" | "center" | "right") || "left"}
        wrap="word"
        draggable={!isEditing}
        onClick={() => selectOnly([element.id])}
        onTap={() => selectOnly([element.id])}
        onDblClick={startEditing}
        onDblTap={startEditing}
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
          const newFontSize = Math.max(4, Math.round((p.fontSize || 18) * scaleY));
          const newWidth = Math.max(5, node.width() * scaleX);
          updateElement(element.id, {
            x: node.x(),
            y: node.y(),
            width: newWidth,
            height: node.height(),
            rotation: node.rotation(),
            props: { fontSize: newFontSize },
          });
        }}
      />
      {!isEditing && <ElementWrapper nodeRef={ref} isSelected={isSelected} />}
    </>
  );
}

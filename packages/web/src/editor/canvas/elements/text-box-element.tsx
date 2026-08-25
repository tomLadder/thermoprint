import { useRef, useCallback, useEffect } from "react";
import { Text } from "react-konva";
import Konva from "konva";
import type { BaseElement } from "../../../store/editor-store.ts";
import { useEditorV2Store } from "../../../store/editor-store.ts";
import { ElementWrapper } from "./element-wrapper.tsx";


function measureWithLetterSpacing(
  ctx: CanvasRenderingContext2D,
  text: string,
  letterSpacing: number,
): number {
  const measured = ctx.measureText(text).width;
  return measured + Math.max(0, text.length - 1) * letterSpacing;
}

function measureTextBlock(
  text: string,
  fontSize: number,
  fontFamily: string,
  fontWeight: number,
  italic: boolean,
  letterSpacing: number,
  maxWidth: number,
  lineHeight = 1,
): { width: number; height: number; lineCount: number } {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return { width: Infinity, height: Infinity, lineCount: 1 };

  ctx.font = `${italic ? "italic " : ""}${fontWeight >= 700 ? "bold " : ""}${fontSize}px "${fontFamily}", sans-serif`;

  const rawLines = (text || "Text").split("\n");
  const lines: string[] = [];

  for (const rawLine of rawLines) {
    if (!rawLine) {
      lines.push("");
      continue;
    }

    const words = rawLine.split(/(\s+)/);
    let line = "";

    for (const part of words) {
      const candidate = line + part;
      if (!line || measureWithLetterSpacing(ctx, candidate, letterSpacing) <= maxWidth) {
        line = candidate;
        continue;
      }

      lines.push(line.trimEnd());
      line = part.trimStart();

      if (measureWithLetterSpacing(ctx, line, letterSpacing) > maxWidth) {
        let chunk = "";
        for (const ch of line) {
          const candidateChunk = chunk + ch;
          if (chunk && measureWithLetterSpacing(ctx, candidateChunk, letterSpacing) > maxWidth) {
            lines.push(chunk);
            chunk = ch;
          } else {
            chunk = candidateChunk;
          }
        }
        line = chunk;
      }
    }

    lines.push(line.trimEnd());
  }

  let width = 0;
  for (const line of lines) {
    width = Math.max(width, measureWithLetterSpacing(ctx, line, letterSpacing));
  }

  const measuredText = new Konva.Text({
    text: lines.join("\n"),
    width: maxWidth,
    fontSize,
    fontFamily,
    fontStyle: `${italic ? "italic " : ""}${fontWeight >= 700 ? "bold" : ""}`.trim() || "normal",
    letterSpacing,
    lineHeight,
    wrap: "word",
    padding: 0,
  });

  const konvaHeight = measuredText.height();

  return {
    width,
    height: konvaHeight,
    lineCount: Math.max(1, lines.length),
  };
}

function fontFits(
  text: string,
  fontSize: number,
  boxWidth: number,
  boxHeight: number,
  fontFamily: string,
  fontWeight: number,
  italic: boolean,
  letterSpacing: number,
  lineHeight: number,
  maxLines?: number,
): boolean {
  const measured = measureTextBlock(
    text,
    fontSize,
    fontFamily,
    fontWeight,
    italic,
    letterSpacing,
    boxWidth,
    lineHeight,
  );
  return measured.height <= boxHeight &&
    (maxLines === undefined || measured.lineCount <= maxLines);
}

function largestFontThatFits(
  text: string,
  maxFontSize: number,
  boxWidth: number,
  boxHeight: number,
  fontFamily: string,
  fontWeight: number,
  italic: boolean,
  letterSpacing: number,
  lineHeight: number,
  maxLines?: number,
): number {
  let low = 4;
  let high = Math.max(4, Math.floor(maxFontSize));
  let best = 4;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (fontFits(
      text, mid, boxWidth, boxHeight, fontFamily, fontWeight,
      italic, letterSpacing, lineHeight, maxLines,
    )) {
      best = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return best;
}

interface FitState {
  fontSize: number;
  actTries: number;
  lineCount: number;
}

function replayTypingState(
  text: string,
  maxFontSize: number,
  boxWidth: number,
  boxHeight: number,
  fontFamily: string,
  fontWeight: number,
  italic: boolean,
  letterSpacing: number,
  step: number,
  tries: number,
  lineHeight: number,
): FitState {
  let fontSize = Math.max(4, Math.floor(maxFontSize));
  let actTries = 0;
  let previousLineCount = 1;
  const decrement = Math.max(1, Math.round(step));
  let prefix = "";

  for (const ch of text || "Text") {
    prefix += ch;
    let measured = measureTextBlock(
      prefix, fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
    );

    if (measured.lineCount > previousLineCount) {
      while (measured.lineCount > previousLineCount && actTries < tries && fontSize > 4) {
        const candidate = Math.max(4, fontSize - decrement);
        if (candidate === fontSize) break;
        fontSize = candidate;
        actTries += 1;
        measured = measureTextBlock(
          prefix, fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
        );
      }

      if (measured.lineCount > previousLineCount) {
        const allowedLines = previousLineCount + 1;
        const refit = largestFontThatFits(
          prefix,
          Math.max(fontSize, 4),
          boxWidth,
          boxHeight,
          fontFamily,
          fontWeight,
          italic,
          letterSpacing,
          lineHeight,
          allowedLines,
        );
        fontSize = Math.max(4, refit);
        actTries = 0;
        measured = measureTextBlock(
          prefix, fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
        );
      }
    }

    previousLineCount = measured.lineCount;
  }

  while (!fontFits(
    text || "Text",
    fontSize,
    boxWidth,
    boxHeight,
    fontFamily,
    fontWeight,
    italic,
    letterSpacing,
    lineHeight,
  ) && fontSize > 4) {
    fontSize -= 1;
    actTries = 0;
  }

  const finalMeasured = measureTextBlock(
    text || "Text", fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
  );

  return { fontSize, actTries, lineCount: finalMeasured.lineCount };
}

function advanceTypingState(
  previousText: string,
  nextText: string,
  state: FitState,
  boxWidth: number,
  boxHeight: number,
  fontFamily: string,
  fontWeight: number,
  italic: boolean,
  letterSpacing: number,
  step: number,
  tries: number,
  lineHeight: number,
): FitState {
  const decrement = Math.max(1, Math.round(step));
  let fontSize = state.fontSize;
  let actTries = state.actTries;
  const before = measureTextBlock(
    previousText || "Text", fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
  );
  let measured = measureTextBlock(
    nextText || "Text", fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
  );

  if (measured.lineCount > before.lineCount) {
    while (measured.lineCount > before.lineCount && actTries < tries && fontSize > 4) {
      fontSize = Math.max(4, fontSize - decrement);
      actTries += 1;
      measured = measureTextBlock(
        nextText || "Text", fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
      );
    }

    if (measured.lineCount > before.lineCount) {
      const refit = largestFontThatFits(
        nextText || "Text",
        Math.max(fontSize, 4),
        boxWidth,
        boxHeight,
        fontFamily,
        fontWeight,
        italic,
        letterSpacing,
        lineHeight,
        before.lineCount + 1,
      );
      fontSize = Math.max(4, refit);
      actTries = 0;
      measured = measureTextBlock(
        nextText || "Text", fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
      );
    }
  }

  if (measured.height > boxHeight) {
    fontSize = largestFontThatFits(
      nextText || "Text",
      fontSize,
      boxWidth,
      boxHeight,
      fontFamily,
      fontWeight,
      italic,
      letterSpacing,
      lineHeight,
    );
    actTries = 0;
    measured = measureTextBlock(
      nextText || "Text", fontSize, fontFamily, fontWeight, italic, letterSpacing, boxWidth, lineHeight,
    );
  }

  return { fontSize, actTries, lineCount: measured.lineCount };
}

interface Props {
  element: BaseElement;
  isSelected: boolean;
}

export function TextBoxElement({ element, isSelected }: Props) {
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
    verticalAlign?: string;
    autoFit?: boolean;
    fitStep?: number;
    fitTries?: number;
    actSize?: number;
    actTries?: number;
    lineHeight?: number;
    italic?: boolean;
  };

  const fontStyle =
    [p.italic ? "italic" : "", p.fontWeight && p.fontWeight >= 700 ? "bold" : ""]
      .filter(Boolean)
      .join(" ") || "normal";

  const configuredFontSize = p.fontSize || 48;
  const fontFamily = p.fontFamily || "Inter";
  const fontWeight = p.fontWeight || 400;
  const italic = !!p.italic;
  const letterSpacing = p.letterSpacing || 0;
  const configuredLineHeight = p.lineHeight ?? 1;
  const effectiveFontSize = p.autoFit ? (p.actSize ?? configuredFontSize) : configuredFontSize;
  const effectiveLineHeight = configuredLineHeight;

  const editFitStateRef = useRef<FitState>({
    fontSize: p.actSize ?? configuredFontSize,
    actTries: p.actTries ?? 0,
    lineCount: 1,
  });
  const editTextRef = useRef(p.text || "Text");


  /* Reflow immediately when a formatting input changes. */
  const fitConfigRef = useRef<string | null>(null);
  useEffect(() => {
    const configKey = JSON.stringify([
      p.autoFit ?? false,
      configuredFontSize,
      p.fitStep ?? 1,
      p.fitTries ?? 0,
      element.width,
      element.height,
      p.fontFamily || "Inter",
      p.fontWeight || 400,
      !!p.italic,
      p.letterSpacing || 0,
      configuredLineHeight,
    ]);

    if (fitConfigRef.current === null) {
      fitConfigRef.current = configKey;
      return;
    }
    if (fitConfigRef.current === configKey) return;
    fitConfigRef.current = configKey;

    if (!p.autoFit) return;

    const replay = replayTypingState(
      p.text || "Text",
      configuredFontSize,
      Math.max(1, element.width),
      Math.max(1, element.height),
      p.fontFamily || "Inter",
      p.fontWeight || 400,
      !!p.italic,
      p.letterSpacing || 0,
      p.fitStep ?? 1,
      p.fitTries ?? 0,
      configuredLineHeight,
    );

    if (p.actSize !== replay.fontSize || p.actTries !== replay.actTries) {
      updateElement(element.id, {
        props: { actSize: replay.fontSize, actTries: replay.actTries },
      });
    }
  }, [
    p.autoFit,
    configuredFontSize,
    p.fitStep,
    p.fitTries,
    element.width,
    element.height,
    p.fontFamily,
    p.fontWeight,
    p.italic,
    p.letterSpacing,
    configuredLineHeight,
    element.id,
    updateElement,
  ]);

  const startEditing = useCallback(() => {
    const node = ref.current;
    if (!node) return;

    useEditorV2Store.setState({ editingTextId: element.id });

    const absPos = node.getAbsolutePosition();
    const stage = node.getStage();
    if (!stage) return;
    const stageRect = stage.container().getBoundingClientRect();
    const scale = node.getAbsoluteScale();

    const initialText = p.text || "Text";
    editFitStateRef.current = {
      fontSize: p.autoFit ? (p.actSize ?? configuredFontSize) : configuredFontSize,
      actTries: p.autoFit ? (p.actTries ?? 0) : 0,
      lineCount: measureTextBlock(
        initialText,
        p.autoFit ? (p.actSize ?? configuredFontSize) : configuredFontSize,
        fontFamily,
        fontWeight,
        italic,
        letterSpacing,
        Math.max(1, element.width),
        configuredLineHeight,
      ).lineCount,
    };
    editTextRef.current = initialText;

    const borderWidth = 2;
    node.hide();
    node.getLayer()?.batchDraw();

    const textarea = document.createElement("textarea");
    textarea.value = initialText;
    textarea.style.position = "fixed";
    textarea.style.left = `${stageRect.left + absPos.x - borderWidth}px`;
    textarea.style.top = `${stageRect.top + absPos.y - borderWidth}px`;
    textarea.style.width = `${element.width * scale.x}px`;
    textarea.style.height = `${element.height * scale.y}px`;
    textarea.style.boxSizing = "content-box";
    textarea.style.fontSize = `${editFitStateRef.current.fontSize * scale.y}px`;
    textarea.style.fontFamily = `'${fontFamily}', sans-serif`;
    textarea.style.fontWeight = fontStyle.includes("bold") ? "bold" : "normal";
    textarea.style.fontStyle = fontStyle.includes("italic") ? "italic" : "normal";
    textarea.style.letterSpacing = `${letterSpacing * scale.x}px`;
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
    textarea.style.lineHeight = `${effectiveLineHeight}`;
    textarea.style.wordBreak = "break-word";
    textarea.style.whiteSpace = "pre-wrap";
    textarea.style.zIndex = "1000";
    textarea.style.transformOrigin = "left top";
    if (element.rotation) textarea.style.transform = `rotate(${element.rotation}deg)`;

    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const commit = () => {
      updateElement(element.id, {
        props: {
          text: textarea.value,
          actSize: editFitStateRef.current.fontSize,
          actTries: editFitStateRef.current.actTries,
        },
      });
      useEditorV2Store.setState({ editingTextId: null });
      document.body.removeChild(textarea);
      node.show();
      node.getLayer()?.batchDraw();
    };

    const refreshFit = () => {
      if (!p.autoFit) {
        updateElement(element.id, { props: { text: textarea.value } });
        editTextRef.current = textarea.value;
        return;
      }

      const nextText = textarea.value;
      const previousText = editTextRef.current;
      const isSimpleAppend =
        nextText.length === previousText.length + 1 && nextText.startsWith(previousText);

      const nextState = isSimpleAppend
        ? advanceTypingState(
            previousText,
            nextText,
            editFitStateRef.current,
            Math.max(1, element.width),
            Math.max(1, element.height),
            fontFamily,
            fontWeight,
            italic,
            letterSpacing,
            p.fitStep ?? 1,
            p.fitTries ?? 0,
            configuredLineHeight,
          )
        : replayTypingState(
            nextText,
            configuredFontSize,
            Math.max(1, element.width),
            Math.max(1, element.height),
            fontFamily,
            fontWeight,
            italic,
            letterSpacing,
            p.fitStep ?? 1,
            p.fitTries ?? 0,
            configuredLineHeight,
          );

      editFitStateRef.current = nextState;
      editTextRef.current = nextText;

      const lh = configuredLineHeight;
      textarea.style.fontSize = `${nextState.fontSize * scale.y}px`;
      textarea.style.lineHeight = `${lh}`;
      updateElement(element.id, {
        props: {
          text: nextText,
          actSize: nextState.fontSize,
          actTries: nextState.actTries,
        },
      });
    };

    textarea.addEventListener("input", refreshFit);
    textarea.addEventListener("blur", commit);
    textarea.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
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
  }, [
    configuredFontSize,
    element,
    fontFamily,
    fontStyle,
    fontWeight,
    italic,
    letterSpacing,
    p,
    updateElement,
    effectiveLineHeight,
  ]);


  return (
    <>
      <Text
        ref={ref}
        id={element.id}
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        rotation={element.rotation}
        text={p.text || "Text"}
        fontSize={effectiveFontSize}
        lineHeight={effectiveLineHeight}
        fontFamily={p.fontFamily || "Inter"}
        fontStyle={fontStyle}
        letterSpacing={p.letterSpacing || 0}
        fill={p.fill || "#000000"}
        align={(p.align as "left" | "center" | "right") || "center"}
        verticalAlign={(p.verticalAlign as "top" | "middle" | "bottom") || "middle"}
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
          updateElement(element.id, {
            x: node.x(),
            y: node.y(),
            width: Math.max(5, element.width * scaleX),
            height: Math.max(5, element.height * scaleY),
            rotation: node.rotation(),
          });
        }}
      />
      {!isEditing && <ElementWrapper nodeRef={ref} isSelected={isSelected} />}
    </>
  );
}

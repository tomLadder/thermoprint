// @ts-nocheck — legacy v1 component, not used by the redesigned editor
import { useState, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface TooltipProps {
  label: string;
  children: ReactNode;
  maxWidth?: number;
}

export function Tooltip({ label, children, maxWidth }: TooltipProps) {
  const [show, setShow] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const getStyle = (): React.CSSProperties => {
    const el = triggerRef.current;
    if (!el) return { display: "none" };
    const rect = el.getBoundingClientRect();

    if (maxWidth) {
      // Open to the right, vertically centered
      return {
        position: "fixed",
        left: rect.right + 8,
        top: rect.top + rect.height / 2,
        transform: "translateY(-50%)",
        maxWidth,
        width: maxWidth,
        whiteSpace: "normal",
      };
    }
    // Open below, horizontally centered
    return {
      position: "fixed",
      left: rect.left + rect.width / 2,
      top: rect.bottom + 6,
      transform: "translateX(-50%)",
      whiteSpace: "nowrap",
    };
  };

  return (
    <div
      ref={triggerRef}
      className="relative inline-flex"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && createPortal(
        <div
          className="px-2 py-1 text-xs rounded bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 shadow-lg pointer-events-none z-50"
          style={getStyle()}
        >
          {label}
        </div>,
        document.body,
      )}
    </div>
  );
}

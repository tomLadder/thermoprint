import React, { useEffect, useState, useRef } from "react";
import {
  getIconData,
  queueIconLoad,
  subscribeToIcons,
} from "../../../lib/iconify.ts";

interface IconifyIconProps {
  name?: string;
  className?: string;
  size?: number | string;
  color?: string;
  title?: string;
}

export const IconifyIcon = React.memo(function IconifyIcon({
  name,
  className = "w-6 h-6",
  size,
  color = "currentColor",
  title,
}: IconifyIconProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [, setTick] = useState(0);

  const icon = name ? getIconData(name) : undefined;

  useEffect(() => {
    if (icon) {
      setIsVisible(true);
      return;
    }

    if (!containerRef.current || typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "150px" }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [name, Boolean(icon)]);

  useEffect(() => {
    if (!name || !isVisible) return;
    if (getIconData(name)) return;

    queueIconLoad(name);
    return subscribeToIcons(() => {
      setTick((t) => t + 1);
    });
  }, [name, isVisible]);

  if (!name) return null;

  if (!icon) {
    return (
      <span
        ref={containerRef}
        className={`inline-block bg-white/5 rounded shrink-0 ${className}`}
        style={size ? { width: size, height: size } : undefined}
      />
    );
  }

  const viewBox = `${icon.left} ${icon.top} ${icon.width} ${icon.height}`;

  return (
    <svg
      viewBox={viewBox}
      className={className}
      style={size ? { width: size, height: size } : undefined}
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title || name}
      dangerouslySetInnerHTML={{ __html: icon.body }}
    />
  );
});

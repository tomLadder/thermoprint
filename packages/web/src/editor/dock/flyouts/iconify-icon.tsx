import React, { useEffect, useState } from "react";
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
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!name) return;
    if (getIconData(name)) return;

    queueIconLoad(name);
    return subscribeToIcons(() => {
      setTick((t) => t + 1);
    });
  }, [name]);

  if (!name) return null;

  const icon = getIconData(name);
  if (!icon) {
    return (
      <span
        className={`inline-block animate-pulse bg-white/10 rounded shrink-0 ${className}`}
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

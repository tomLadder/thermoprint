import type { ReactNode } from "react";

// Shared field components used across all inspector sections

export function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="px-3 py-2.5 border-b border-white/5">
      <div className="text-ui-2xs font-mono uppercase tracking-[0.12em] text-ink-500 mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

export function Field({
  label,
  mono,
  children,
}: {
  label: string;
  mono?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2">
      <span
        className={`text-ui-xs uppercase tracking-wider text-ink-400 shrink-0 ${
          mono ? "font-mono" : ""
        }`}
      >
        {label}
      </span>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}

export function NumInput({
  value,
  onChange,
  suffix,
  min,
  max,
  step = 1,
}: {
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const formatVal = (v: number) => {
    if (isNaN(v)) return 0;
    return Number(v.toFixed(2));
  };

  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? step : -step;
    let newVal = formatVal((value || 0) + delta);
    if (min !== undefined) newVal = Math.max(min, newVal);
    if (max !== undefined) newVal = Math.min(max, newVal);
    onChange(newVal);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let newVal = formatVal((value || 0) + step);
      if (max !== undefined) newVal = Math.min(max, newVal);
      onChange(newVal);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let newVal = formatVal((value || 0) - step);
      if (min !== undefined) newVal = Math.max(min, newVal);
      onChange(newVal);
    }
  };

  const displayVal =
    value === undefined || value === null
      ? 0
      : Number.isInteger(value)
      ? value
      : Number(value.toFixed(1));

  return (
    <div className="flex items-center h-7 rounded-md bg-ink-800 border border-white/5 focus-within:border-accent/50 px-1">
      <input
        type="number"
        value={displayVal}
        step={step}
        min={min}
        max={max}
        onWheel={handleWheel}
        onKeyDown={handleKeyDown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent px-1 text-ui-sm text-ink-100 font-mono outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="text-ui-2xs font-mono text-ink-400 pr-1 select-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  return (
    <input
      value={value ?? ""}
      placeholder={placeholder}
      autoFocus={autoFocus}
      onChange={(e) => onChange(e.target.value)}
      onFocus={(e) => {
        if (autoFocus) e.target.select();
      }}
      className="w-full h-7 px-2 rounded-md bg-ink-800 border border-white/5 focus:border-accent/50 outline-none text-ui-sm text-ink-100"
    />
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-7 px-2 rounded-md bg-ink-800 border border-white/5 focus:border-accent/50 outline-none text-ui-sm text-ink-100"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function SegBtn({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`h-7 flex-1 flex items-center justify-center rounded-[4px] text-ui-sm ${
        active ? "bg-ink-700 text-accent" : "text-ink-300 hover:text-ink-100"
      }`}
    >
      {children}
    </button>
  );
}

export function SegGroup({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-0 p-0.5 rounded-md bg-ink-800 border border-white/5">
      {children}
    </div>
  );
}

export function ColorInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center h-7 rounded-md bg-ink-800 border border-white/5 px-1.5 gap-1.5">
      <div
        className="w-4 h-4 rounded-sm border border-white/10 shrink-0"
        style={{ background: value || "#000000" }}
      />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 bg-transparent text-ui-sm text-ink-100 font-mono outline-none"
      />
    </div>
  );
}

/**
 * Date/Time preset evaluation using Intl.DateTimeFormat.
 * Zero hardcoded translations — locale drives everything.
 *
 * Offset syntax: any token can have +N or -N appended (e.g. DD+7, MM+3, YYYY+1).
 * The offset shifts the BASE DATE for ALL tokens in the template.
 * Example: "DD+7.MM.YYYY" → all tokens evaluate against (today + 7 days).
 */

export type DatePreset = "date" | "time" | "datetime" | "month_year" | "custom";

export const DATE_PRESET_OPTIONS: { value: DatePreset; label: string }[] = [
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "datetime", label: "Date & Time" },
  { value: "month_year", label: "Month & Year" },
  { value: "custom", label: "Custom" },
];

/** Format template strings for each preset (custom has none) */
export const PRESET_FORMATS: Record<string, string> = {
  date: "DD.MM.YYYY",
  time: "HH:mm",
  datetime: "DD.MM.YYYY HH:mm",
  month_year: "MMMM YYYY",
};

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/**
 * Safely format locale-dependent tokens without crashing on incomplete/invalid locale strings (e.g. while user is typing "u" or "a").
 */
function formatLocaleToken(
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
  date: Date,
): string {
  const primary = locale && locale !== "auto" && locale.trim() ? locale.trim() : (navigator?.language ?? "en");
  try {
    return new Intl.DateTimeFormat(primary, options).format(date);
  } catch {
    const fallback = navigator?.language ?? "en";
    try {
      return new Intl.DateTimeFormat(fallback, options).format(date);
    } catch {
      return new Intl.DateTimeFormat("en", options).format(date);
    }
  }
}

type OffsetUnit = "day" | "month" | "year" | "hour" | "minute" | "second";

/**
 * Scan the template for offset expressions and compute a shifted date.
 * All offsets are cumulative and applied to a single base date.
 */
function computeShiftedDate(template: string, base: Date): Date {
  const d = new Date(base);
  const offsetRegex = /(?:MMMM|MMM|dddd|ddd|YYYY|YY|DD|MM|HH|mm|ss)([+-]\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = offsetRegex.exec(template)) !== null) {
    const token = match[0].replace(match[1], "");
    const offset = parseInt(match[1], 10);
    if (isNaN(offset)) continue;

    let unit: OffsetUnit = "day";
    if (token === "YYYY" || token === "YY") unit = "year";
    else if (token === "MMMM" || token === "MMM" || token === "MM") unit = "month";
    else if (token === "DD" || token === "dddd" || token === "ddd") unit = "day";
    else if (token === "HH") unit = "hour";
    else if (token === "mm") unit = "minute";
    else if (token === "ss") unit = "second";

    switch (unit) {
      case "day": d.setDate(d.getDate() + offset); break;
      case "month": d.setMonth(d.getMonth() + offset); break;
      case "year": d.setFullYear(d.getFullYear() + offset); break;
      case "hour": d.setHours(d.getHours() + offset); break;
      case "minute": d.setMinutes(d.getMinutes() + offset); break;
      case "second": d.setSeconds(d.getSeconds() + offset); break;
    }
  }
  return d;
}

/**
 * Strip offset expressions from tokens, leaving only the base token.
 * e.g. "DD+7.MM.YYYY" → "DD.MM.YYYY"
 */
function stripOffsets(template: string): string {
  return template.replace(
    /(MMMM|MMM|dddd|ddd|YYYY|YY|DD|MM|HH|mm|ss)[+-]\d+/g,
    "$1",
  );
}

/**
 * Evaluate a format template string into a human-readable date/time.
 *
 * Supported tokens (all accept optional +N/-N offset):
 *   DD    — zero-padded day (01–31)
 *   MM    — zero-padded month (01–12)
 *   YYYY  — 4-digit year
 *   YY    — 2-digit year
 *   HH    — 24h zero-padded hour
 *   mm    — zero-padded minutes
 *   ss    — zero-padded seconds
 *   MMMM  — full month name (locale-sensitive)
 *   MMM   — short month name (locale-sensitive)
 *   dddd  — full weekday name (locale-sensitive)
 *   ddd   — short weekday name (locale-sensitive)
 */
export function evaluateFormatTemplate(
  template: string,
  date: Date = new Date(),
  locale?: string,
): string {
  // 1. Compute shifted date from any offsets in the template
  const d = computeShiftedDate(template, date);

  // 2. Strip offsets so we have clean tokens to replace
  let result = stripOffsets(template);

  // 3. Replace tokens (longest first to avoid partial matches)
  result = result.replace(/MMMM/g, formatLocaleToken(locale, { month: "long" }, d));
  result = result.replace(/MMM/g, formatLocaleToken(locale, { month: "short" }, d));
  result = result.replace(/dddd/g, formatLocaleToken(locale, { weekday: "long" }, d));
  result = result.replace(/ddd/g, formatLocaleToken(locale, { weekday: "short" }, d));
  result = result.replace(/YYYY/g, `${d.getFullYear()}`);
  result = result.replace(/YY/g, `${d.getFullYear()}`.slice(-2));
  result = result.replace(/DD/g, pad(d.getDate()));
  result = result.replace(/MM/g, pad(d.getMonth() + 1));
  result = result.replace(/HH/g, pad(d.getHours()));
  result = result.replace(/mm/g, pad(d.getMinutes()));
  result = result.replace(/ss/g, pad(d.getSeconds()));

  return result;
}

/**
 * Check if a text element has a date preset and return
 * the evaluated display text for the canvas.
 */
export function getDisplayText(
  text: string,
  datePreset?: DatePreset,
  dateLocale?: string,
): string {
  if (!datePreset) return text;
  if (!text) return text;
  try {
    return evaluateFormatTemplate(text, new Date(), dateLocale);
  } catch {
    return text;
  }
}

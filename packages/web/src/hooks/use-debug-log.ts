import { useSyncExternalStore } from "react";
import {
  getDebugLog,
  getDebugLogVersion,
  onDebugLogChange,
  type DebugEntry,
} from "@thermoprint/core";

const subscribe = (fn: () => void) => onDebugLogChange(fn);
const getSnapshot = () => getDebugLogVersion();

export function useDebugLog(): readonly DebugEntry[] {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return getDebugLog();
}

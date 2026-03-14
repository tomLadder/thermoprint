import { Sun, Moon, Monitor } from "lucide-react";
import { useTheme } from "./theme-provider.tsx";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const next = () => {
    const order = ["light", "dark", "system"] as const;
    const idx = order.indexOf(theme);
    setTheme(order[(idx + 1) % order.length]);
  };

  return (
    <button
      onClick={next}
      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
      title={`Theme: ${theme}`}
    >
      {theme === "light" && <Sun size={18} />}
      {theme === "dark" && <Moon size={18} />}
      {theme === "system" && <Monitor size={18} />}
    </button>
  );
}

import { useTheme } from "../context/ThemeContext";
import useMetaThemeSync from "../hooks/useMetaThemeSync";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./ui/button";

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  useMetaThemeSync(resolvedTheme);

  const handleClick = (e) => {
    if (e.shiftKey) {
      setTheme("system");
    } else {
      setTheme(resolvedTheme === "dark" ? "light" : "dark");
    }
  };

  const Icon = theme === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;
  const label = theme === "system" ? "System" : resolvedTheme === "dark" ? "Light" : "Dark";

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={handleClick}
      className={`rounded-full ${className}`}
      aria-label={`Switch to ${label} theme (Shift-click for System)`}
      title={`${theme === "system" ? "System" : resolvedTheme === "dark" ? "Dark" : "Light"} · Shift-click → System`}
    >
      <Icon className="h-[18px] w-[18px] transition-transform duration-300 hover:rotate-45" />
    </Button>
  );
}

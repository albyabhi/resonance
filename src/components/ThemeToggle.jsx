import { useTheme } from "../context/ThemeContext";
import { Sun, Moon, Monitor } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "./ui/dropdown-menu";

const OPTIONS = [
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
  { value: "system", label: "System", Icon: Monitor },
];

export default function ThemeToggle({ className = "" }) {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const Icon =
    theme === "system" ? Monitor : resolvedTheme === "dark" ? Sun : Moon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          onClick={(e) => {
            if (e.shiftKey) {
              setTheme("system");
            }
          }}
          className={`rounded-full ${className}`}
          aria-label="Change theme"
          title="Theme · Shift-click → System"
        >
          <Icon className="h-[18px] w-[18px]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8}>
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={theme} onValueChange={setTheme}>
          {OPTIONS.map((option) => (
            <DropdownMenuRadioItem
              key={option.value}
              value={option.value}
              className="gap-2.5"
            >
              <option.Icon className="h-4 w-4" />
              {option.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

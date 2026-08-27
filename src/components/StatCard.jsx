import { FadeIn } from "./AnimateReveal";

const ACCENT = {
  blue: { css: "icon-tile-blue", color: "var(--accent-blue)" },
  purple: { css: "icon-tile-purple", color: "var(--accent-purple)" },
  green: { css: "icon-tile-green", color: "var(--accent-green)" },
  amber: { css: "icon-tile-amber", color: "var(--accent-amber)" },
  teal: { css: "icon-tile-teal", color: "var(--accent-teal)" },
  red: { css: "icon-tile-red", color: "var(--accent-red)" },
  terracotta: { css: "icon-tile-red", color: "var(--accent-red)" },
  mustard: { css: "icon-tile-amber", color: "var(--accent-amber)" },
  plum: { css: "icon-tile-purple", color: "var(--accent-purple)" },
  forest: { css: "icon-tile-teal", color: "var(--accent-teal)" },
};

function Sparkline({ color = "var(--accent-blue)", data = [2, 3, 2.5, 4, 3.5, 5, 4.5] }) {
  const w = 80;
  const h = 28;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = w / (data.length - 1);
  const points = data.map((v, i) => `${i * stepX},${h - ((v - min) / range) * (h - 4) - 2}`).join(" ");
  const d = points
    .split(" ")
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.replace(",", " ")}`)
    .join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" className="shrink-0">
      <path d={d} stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, variant = "blue", delay = 0 }) {
  const v = ACCENT[variant] || ACCENT.blue;

  return (
    <FadeIn delay={delay} className="h-full w-full">
      <div className="flex sm:hidden flex-col items-center justify-center p-2 rounded-lg border text-center w-full h-full min-w-0"
        style={{ backgroundColor: "var(--card)", borderColor: "var(--border)" }}>
        <span className="text-[9px] font-black uppercase tracking-wider truncate w-full"
          style={{ color: "var(--muted-foreground)" }}>
          {title}
        </span>
        <span className="font-extrabold mt-0.5 truncate w-full"
          style={{ color: "var(--card-foreground)", fontSize: typeof value === "string" ? "11px" : "14px" }}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
      </div>

      <div className="hidden sm:flex card-premium relative flex-col h-full w-full">
        <div className="flex items-start justify-between gap-4">
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${v.css}`}>
            {Icon && <Icon className="h-5 w-5" />}
          </div>
          <Sparkline color={v.color} />
        </div>
        <div className="mt-3 flex flex-col gap-1">
          <span className="text-xs font-medium" style={{ color: "var(--muted-foreground)" }}>
            {title}
          </span>
          <span className="text-2xl font-bold leading-none tracking-tight" style={{ color: "var(--card-foreground)" }}>
            {typeof value === "number" ? value.toLocaleString() : value}
          </span>
          {subtitle && (
            <span className="text-xs" style={{ color: "var(--muted-foreground)" }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </FadeIn>
  );
}

export default StatCard;

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { PetIcon } from "@/components/pet-icons";
import { categoryLabels } from "@/lib/record-constants";
import type { RecordCategory } from "@/lib/types";

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-base font-bold text-[#20291f]">{title}</h2>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function Card({
  children,
  className = "",
  interactive = false,
  motion = "none",
}: {
  children: ReactNode;
  className?: string;
  interactive?: boolean;
  motion?: "none" | "rise";
}) {
  const motionClassName = motion === "rise" ? "pet-log-card-rise" : "";
  const interactiveClassName = interactive ? "pet-log-pressable" : "";

  return (
    <section className={`rounded-2xl border border-[#cdd8c6] bg-white p-4 shadow-[0_10px_28px_rgba(49,65,44,0.1)] ${motionClassName} ${interactiveClassName} ${className}`}>
      {children}
    </section>
  );
}

export function Pill({
  children,
  active = false,
  className = "",
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  onClick?: ButtonHTMLAttributes<HTMLButtonElement>["onClick"];
}) {
  const pillClassName = `inline-flex h-9 shrink-0 items-center justify-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition ${
    active ? "bg-[#16804b] text-white" : "bg-[#f0f3ed] text-[#616b5d]"
  } ${onClick ? "focus:outline-none focus:ring-2 focus:ring-[#16804b]/20" : ""} ${className}`;

  if (onClick) {
    return (
      <button aria-pressed={active} className={pillClassName} onClick={onClick} type="button">
        {children}
      </button>
    );
  }

  return (
    <span className={pillClassName}>
      {children}
    </span>
  );
}

export function CategoryBadge({ category }: { category: RecordCategory }) {
  const colors: Record<RecordCategory, string> = {
    meal: "bg-[#e8f5df] text-[#32783c]",
    walk: "bg-[#e8f0ff] text-[#356aa8]",
    stool: "bg-[#fff2dd] text-[#a4651a]",
    medical: "bg-[#ffe9e6] text-[#be4c3c]",
    behavior: "bg-[#f0eaff] text-[#7256b8]",
  };

  return (
    <span className={`inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold leading-4 ${colors[category]}`}>
      {categoryLabels[category]}
    </span>
  );
}

export function MiniLineChart({ values, tone = "#16804b" }: { values: number[]; tone?: string }) {
  const width = 190;
  const height = 70;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 16) - 8;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg className="h-[70px] w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
      <polyline className="pet-log-chart-draw" fill="none" points={points} stroke={tone} strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" />
      {values.map((value, index) => {
        const x = (index / (values.length - 1)) * width;
        const y = height - ((value - min) / range) * (height - 16) - 8;
        return <circle cx={x} cy={y} fill="white" key={`${value}-${index}`} r="3.5" stroke={tone} strokeWidth="2" />;
      })}
    </svg>
  );
}

export type MultiLineChartSeries = {
  label: string;
  values: number[];
  color: string;
};

export function MultiLineChart({ series }: { series: MultiLineChartSeries[] }) {
  const width = 220;
  const height = 104;
  const allValues = series.flatMap((item) => item.values);
  const min = Math.min(0, ...allValues);
  const max = Math.max(1, ...allValues);
  const range = max - min || 1;

  const getPoint = (value: number, index: number, length: number) => {
    const x = length > 1 ? (index / (length - 1)) * width : width / 2;
    const y = height - ((value - min) / range) * (height - 24) - 12;
    return { x, y };
  };

  return (
    <svg aria-label="변화 추이 그래프" className="h-[112px] w-full" role="img" viewBox={`0 0 ${width} ${height}`}>
      {[0, 1, 2].map((line) => {
        const y = 12 + line * 38;
        return <line key={line} stroke="#e8ede3" strokeDasharray="3 5" strokeWidth="1" x1="0" x2={width} y1={y} y2={y} />;
      })}
      {series.map((item) => {
        const points = item.values
          .map((value, index) => {
            const point = getPoint(value, index, item.values.length);
            return `${point.x},${point.y}`;
          })
          .join(" ");

        return (
          <g key={item.label}>
            <polyline className="pet-log-chart-draw" fill="none" points={points} stroke={item.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
            {item.values.map((value, index) => {
              const point = getPoint(value, index, item.values.length);
              return <circle cx={point.x} cy={point.y} fill="white" key={`${item.label}-${index}`} r="2.7" stroke={item.color} strokeWidth="1.8" />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

export function MetricSparkline({ values, color }: { values: number[]; color: string }) {
  const width = 200;
  const height = 28;
  const min = Math.min(0, ...values);
  const max = Math.max(1, ...values);
  const range = max - min || 1;

  const getPoint = (value: number, index: number) => {
    const x = values.length > 1 ? (index / (values.length - 1)) * width : width / 2;
    const y = height - ((value - min) / range) * (height - 8) - 4;
    return { x, y };
  };

  const points = values.map((v, i) => {
    const p = getPoint(v, i);
    return `${p.x},${p.y}`;
  }).join(" ");

  const areaPoints = [
    `0,${height}`,
    ...values.map((v, i) => {
      const p = getPoint(v, i);
      return `${p.x},${p.y}`;
    }),
    `${width},${height}`,
  ].join(" ");

  return (
    <svg aria-hidden="true" className="h-7 w-full" preserveAspectRatio="none" viewBox={`0 0 ${width} ${height}`}>
      <polygon fill={color} fillOpacity="0.08" points={areaPoints} />
      <polyline className="pet-log-chart-draw" fill="none" points={points} stroke={color} strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
    </svg>
  );
}

export function AiMascot({ active = false, label = "AI" }: { active?: boolean; label?: string }) {
  return (
    <div className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full border border-[#caead5] bg-[#f4fff7] text-[#16804b] shadow-inner ${active ? "pet-log-float-soft" : ""}`}>
      <PetIcon className="h-5 w-5" name="sparkle" />
      <span className="absolute -bottom-1 rounded-full border border-[#caead5] bg-white px-1.5 text-[9px] font-black leading-4 text-[#16804b]">
        {label}
      </span>
      {active ? <span className="pet-log-pulse-dot absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-[#16804b]" /> : null}
    </div>
  );
}

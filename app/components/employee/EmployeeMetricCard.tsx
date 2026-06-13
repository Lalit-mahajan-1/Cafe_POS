import type { ReactNode } from "react";

type EmployeeMetricCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: ReactNode;
  variant?: "cream" | "terracotta" | "espresso";
};

export default function EmployeeMetricCard({
  label,
  value,
  detail,
  icon,
  variant = "cream",
}: EmployeeMetricCardProps) {
  const variants = {
    cream: "border-[#E6DDD1] bg-[#FDFBF7] text-[#000505]",
    terracotta: "border-[#C86446] bg-[#C86446] text-[#FDFBF7]",
    espresso: "border-[#000505] bg-[#000505] text-[#FDFBF7]",
  };

  return (
    <article className={`rounded-lg border p-5 shadow-sm ${variants[variant]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium opacity-75">{label}</p>
          <p className="mt-3 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className="rounded-lg bg-white/20 p-3">{icon}</div>
      </div>
      <p className="mt-4 text-sm opacity-80">{detail}</p>
    </article>
  );
}

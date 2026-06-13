import Link from "next/link";
import type { ReactNode } from "react";

type EmployeeTaskCardProps = {
  title: string;
  detail: string;
  status: string;
  href: string;
  action: string;
  icon: ReactNode;
};

export default function EmployeeTaskCard({
  title,
  detail,
  status,
  href,
  action,
  icon,
}: EmployeeTaskCardProps) {
  return (
    <article className="rounded-lg border border-[#E6DDD1] bg-[#FDFBF7] p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-[#F3EFE8] p-2 text-[#C86446]">{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-[#000505]">{title}</h3>
            <span className="rounded-full bg-[#F3EFE8] px-3 py-1 text-xs font-semibold text-[#705C53]">
              {status}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#705C53]">{detail}</p>
          <Link
            href={href}
            className="mt-4 inline-flex rounded-md bg-[#000505] px-4 py-2 text-sm font-semibold text-[#FDFBF7] transition hover:bg-[#705C53]"
          >
            {action}
          </Link>
        </div>
      </div>
    </article>
  );
}

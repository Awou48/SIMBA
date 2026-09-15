import React from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import { cn } from "../../app/components/ui/utils";
import type { ChildFlag } from "../../lib/api";

export function PageHeader({
  title,
  description,
  actions,
  breadcrumb,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumb?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between mb-6">
      <div className="min-w-0">
        {breadcrumb && <div className="text-xs text-muted-foreground mb-1">{breadcrumb}</div>}
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}

export function Panel({ title, description, actions, children, className }: { title?: string; description?: string; actions?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border bg-card text-card-foreground shadow-sm", className)}>
      {(title || actions) && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4 pb-3 border-b">
          <div>
            {title && <h2 className="text-sm font-bold">{title}</h2>}
            {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatCard({ label, value, hint, tone = "default", icon }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: "default" | "good" | "warn" | "bad" | "info"; icon?: React.ReactNode }) {
  const tones: Record<string, string> = {
    default: "text-foreground",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-red-600",
    info: "text-indigo-600",
  };
  return (
    <div className="rounded-xl border bg-card p-4 shadow-sm flex items-start gap-3">
      {icon && <div className="rounded-lg bg-muted p-2 text-muted-foreground shrink-0">{icon}</div>}
      <div className="min-w-0">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <p className={cn("text-2xl font-extrabold leading-tight mt-1", tones[tone])}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      </div>
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
      <AlertCircle size={16} /> {message}
    </div>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-12 text-muted-foreground", className)}>
      <Loader2 className="animate-spin" size={22} />
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-12 px-4">
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="text-xs text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export const FLAG_META: Record<ChildFlag, { label: string; className: string }> = {
  normal: { label: "Normal", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  stunted: { label: "Stunted", className: "bg-red-50 text-red-700 border-red-200" },
  underweight: { label: "Underweight", className: "bg-orange-50 text-orange-700 border-orange-200" },
  wasted: { label: "Wasted", className: "bg-red-50 text-red-700 border-red-200" },
  overweight: { label: "Overweight", className: "bg-amber-50 text-amber-700 border-amber-200" },
  stale: { label: "Not measured 30d+", className: "bg-slate-100 text-slate-600 border-slate-200" },
  no_data: { label: "No measurement", className: "bg-slate-100 text-slate-500 border-slate-200" },
};

export function FlagBadge({ flag }: { flag: ChildFlag }) {
  const m = FLAG_META[flag] ?? { label: flag, className: "bg-muted text-muted-foreground" };
  return <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", m.className)}>{m.label}</span>;
}

export function ZBadge({ z, label }: { z: number | null | undefined; label?: string }) {
  if (z == null) return <span className="text-xs text-muted-foreground">—</span>;
  const cls = Math.abs(z) > 2 ? "text-red-600 bg-red-50" : Math.abs(z) > 1 ? "text-amber-600 bg-amber-50" : "text-emerald-600 bg-emerald-50";
  return (
    <span className={cn("inline-flex items-baseline gap-1 rounded-md px-1.5 py-0.5 font-mono text-xs font-semibold", cls)}>
      {label && <span className="font-sans text-[10px] font-semibold opacity-70">{label}</span>}
      {z > 0 ? "+" : ""}{z.toFixed(2)}
    </span>
  );
}

export function Pill({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("inline-flex items-center rounded-md border bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground", className)}>{children}</span>;
}

export const fmtDate = (iso: string | null | undefined, withYear = true) =>
  iso ? new Date(iso.length === 10 ? iso + "T00:00:00" : iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }) : "—";

export const fmtAge = (months: number) => (months < 24 ? `${months} mo` : `${Math.floor(months / 12)} yr ${months % 12} mo`);

export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;

export function rateTone(rate: number): "good" | "warn" | "bad" {
  return rate > 0.3 ? "bad" : rate > 0.2 ? "warn" : "good";
}

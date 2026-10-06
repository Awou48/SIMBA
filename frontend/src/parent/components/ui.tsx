import { useEffect, useState, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { icons, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minus, Plus, X, Check, AlertCircle, Loader2, type LucideIcon } from "lucide-react";
import { cn } from "../../app/components/ui/utils";
import type { Tone } from "../../lib/id";

export function Icon({ name, size = 22, className }: { name: string; size?: number; className?: string }) {
  const key = name
    .split("-")
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("") as keyof typeof icons;
  const Cmp = (icons[key] as LucideIcon | undefined) ?? AlertCircle;
  return <Cmp size={size} strokeWidth={2.2} className={className} aria-hidden />;
}

export { ChevronLeft, ChevronRight, ChevronDown, ChevronUp, Minus, Plus, X, Check };

export function toneClass(tone: Tone) {
  return `sb-tone-${tone}`;
}

export function Card({ children, className, tone, onClick, pad = "p-4" }: { children: ReactNode; className?: string; tone?: Tone; onClick?: () => void; pad?: string }) {
  const base = cn("sb-hard rounded-[20px] bg-white mb-3 text-left w-full", tone && toneClass(tone), pad, className);
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cn(base, "sb-press block")}>
        {children}
      </button>
    );
  return <div className={base}>{children}</div>;
}

export function VerdictCard({ icon, headline, detail, tone, onClick, action }: { icon: string; headline: string; detail: string; tone: Tone; onClick?: () => void; action?: string }) {
  return (
    <Card tone={tone} onClick={onClick}>
      <div className="flex gap-3.5">
        <div className="size-12 shrink-0 rounded-full bg-white sb-outline grid place-items-center">
          <Icon name={icon} size={26} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="sb-display text-[19px] leading-6">{headline}</p>
          <p className="text-[14px] text-[var(--ink)]/85 leading-5 mt-1">{detail}</p>
          {action ? <p className="text-[14px] font-extrabold mt-2">{action} ›</p> : null}
        </div>
      </div>
    </Card>
  );
}

export function YellowBar({ title, subtitle, onBack, right, children }: { title: string; subtitle?: string; onBack?: () => void; right?: ReactNode; children?: ReactNode }) {
  return (
    <div className="bg-[var(--yellow)] border-b-2 border-[var(--ink)] px-4 pt-4 pb-5 md:px-8 md:pt-8">
      <div className="max-w-[640px] mx-auto">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button type="button" onClick={onBack} aria-label="Kembali" className="size-[46px] rounded-full bg-white sb-hard-sm sb-press-sm grid place-items-center shrink-0">
              <ChevronLeft size={24} />
            </button>
          ) : null}
          <div className="flex-1 min-w-0">
            <h1 className="sb-display text-[26px] leading-8">{title}</h1>
            {subtitle ? <p className="text-[14px] font-bold text-[var(--header-sub)] mt-0.5">{subtitle}</p> : null}
          </div>
          {right}
        </div>
        {children}
      </div>
    </div>
  );
}

export function Section({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <div className="flex items-center justify-between mt-2 mb-2">
      <h2 className="sb-display text-[19px]">{title}</h2>
      {action && onAction ? (
        <button type="button" onClick={onAction} className="text-[14px] font-extrabold text-[var(--coral)]">
          {action} ›
        </button>
      ) : null}
    </div>
  );
}

export function Button({ title, variant = "primary", loading, icon, className, small, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { title: string; variant?: "primary" | "white" | "ink" | "ghost"; loading?: boolean; icon?: string; small?: boolean }) {
  if (variant === "ghost")
    return (
      <button type="button" {...rest} disabled={rest.disabled || loading} className={cn("w-full py-3 text-[15px] font-extrabold text-[var(--coral)]", className)}>
        {title}
      </button>
    );
  const look = variant === "primary" ? "bg-[var(--coral)] text-white" : variant === "ink" ? "bg-[var(--ink)] text-[var(--yellow)]" : "bg-white text-[var(--ink)]";
  return (
    <button
      type="button"
      {...rest}
      disabled={rest.disabled || loading}
      className={cn("sb-hard sb-press rounded-full flex items-center justify-center gap-2 sb-display disabled:opacity-60 disabled:pointer-events-none", small ? "px-4 py-2.5 text-[15px]" : "w-full px-5 py-[15px] text-[18px]", look, className)}
    >
      {loading ? <Loader2 className="animate-spin" size={20} /> : icon ? <Icon name={icon} size={small ? 18 : 20} /> : null}
      {title}
    </button>
  );
}

export function Field({ label, hint, error, icon, className, ...input }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string; icon?: string }) {
  return (
    <label className="block mb-3">
      <span className="block text-[14px] font-extrabold mb-1.5">{label}</span>
      <span className="relative block">
        {icon ? (
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <Icon name={icon} size={20} />
          </span>
        ) : null}
        <input {...input} className={cn("sb-input", icon && "with-icon", error && "border-[var(--coral)]", className)} />
      </span>
      {error ? <span className="block text-[13px] font-bold text-[#c4302e] mt-1.5">{error}</span> : hint ? <span className="block text-[13px] text-[var(--muted)] mt-1.5 leading-[18px]">{hint}</span> : null}
    </label>
  );
}

export function DateField({ label, value, onChange, hint, max }: { label: string; value: string; onChange: (iso: string) => void; hint?: string; max?: string }) {
  return <Field label={label} type="date" icon="calendar" value={value} max={max} onChange={(e) => onChange(e.target.value)} hint={hint} />;
}

export function Pill({ children, tone = "muted", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return <span className={cn("inline-flex items-center px-2.5 py-1 rounded-full sb-outline text-[12px] font-extrabold text-center leading-tight", toneClass(tone), className)}>{children}</span>;
}

export function Chips<T extends string>({ options, value, onChange }: { options: { value: T; label: string; icon?: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(o.value)} className={cn("sb-outline sb-press-sm rounded-full px-4 py-2.5 text-[14px] font-extrabold flex items-center gap-1.5", on ? "bg-[var(--ink)] text-[var(--yellow)]" : "bg-white")}>
            {o.icon ? <Icon name={o.icon} size={16} /> : null}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Stepper({ value, onChange, step = 0.1, min = 0, max = 100, unit, color = "coral" }: { value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; unit: string; color?: "coral" | "teal" }) {
  const decimals = step < 1 ? String(step).split(".")[1]?.length ?? 1 : 0;
  const clamp = (v: number) => Math.min(max, Math.max(min, +v.toFixed(decimals)));
  const [draft, setDraft] = useState(value.toFixed(decimals).replace(".", ","));
  useEffect(() => setDraft(value.toFixed(decimals).replace(".", ",")), [value, decimals]);
  const commit = () => {
    const n = parseFloat(draft.replace(",", "."));
    if (!Number.isNaN(n)) onChange(clamp(n));
    else setDraft(value.toFixed(decimals).replace(".", ","));
  };
  return (
    <div className="flex items-center justify-center gap-4">
      <button type="button" aria-label="Kurangi" onClick={() => onChange(clamp(value - step))} className="size-[52px] rounded-full bg-white sb-hard-sm sb-press-sm grid place-items-center">
        <Minus size={26} />
      </button>
      <label className="flex flex-col items-center min-w-[130px]">
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} inputMode="decimal" className="sb-display text-[44px] leading-none text-center bg-transparent border-0 border-b-2 border-transparent focus:border-[var(--coral)] outline-none w-[150px]" aria-label={`Nilai ${unit}`} />
        <span className="text-[13px] font-bold text-[var(--muted)] mt-1">{unit} · ketuk untuk ketik</span>
      </label>
      <button type="button" aria-label="Tambah" onClick={() => onChange(clamp(value + step))} className={cn("size-[52px] rounded-full sb-hard-sm sb-press-sm grid place-items-center text-white", color === "coral" ? "bg-[var(--coral)]" : "bg-[var(--teal)]")}>
        <Plus size={26} />
      </button>
    </div>
  );
}

export function Progress({ value, color = "var(--coral)", height = 12 }: { value: number; color?: string; height?: number }) {
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="w-full sb-outline overflow-hidden bg-[var(--track)]" style={{ height, borderRadius: height / 2 }}>
      <div className="sb-fill h-full" style={{ width: `${v}%`, background: color, borderRight: v > 0 && v < 100 ? "2px solid var(--ink)" : undefined }} />
    </div>
  );
}

export function Ring({ value, size = 96, stroke = 12, color = "var(--coral)", label, sub }: { value: number; size?: number; stroke?: number; color?: string; label?: string; sub?: string }) {
  const r = (size - stroke) / 2 - 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value || 0));
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ink)" strokeWidth={stroke + 4} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v / 100)} strokeLinecap="round" style={{ transition: "stroke-dashoffset 0.7s ease" }} />
      </svg>
      <div className="text-center">
        {label ? <div className="sb-display" style={{ fontSize: size * 0.21 }}>{label}</div> : null}
        {sub ? <div className="text-[12px] font-extrabold text-[var(--muted)]">{sub}</div> : null}
      </div>
    </div>
  );
}

export function ListItem({ title, subtitle, right, onClick, icon, tone = "coral", last }: { title: string; subtitle?: string; right?: ReactNode; onClick?: () => void; icon: string; tone?: Tone; last?: boolean }) {
  const body = (
    <>
      <span className={cn("size-[46px] rounded-[14px] sb-outline grid place-items-center shrink-0", toneClass(tone))}>
        <Icon name={icon} size={22} />
      </span>
      <span className="flex-1 min-w-0 text-left">
        <span className="block text-[16px] font-extrabold">{title}</span>
        {subtitle ? <span className="block text-[13px] text-[var(--muted)] mt-0.5">{subtitle}</span> : null}
      </span>
      {right ?? (onClick ? <ChevronRight size={20} className="text-[var(--muted)]" /> : null)}
    </>
  );
  const cls = cn("flex items-center gap-3 py-3 w-full", !last && "border-b-2 border-dashed border-[var(--track)]");
  return onClick ? (
    <button type="button" onClick={onClick} className={cn(cls, "hover:bg-[var(--cream)]/60 rounded-lg")}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export function Empty({ icon = "sun", title, body, action }: { icon?: string; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-6 px-3 gap-2">
      <Icon name={icon} size={44} className="text-[var(--muted)]" />
      <p className="sb-display text-[18px]">{title}</p>
      {body ? <p className="text-[14px] text-[var(--muted)] leading-5">{body}</p> : null}
      {action ? <div className="mt-3 w-full">{action}</div> : null}
    </div>
  );
}

export function Loading({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-[var(--muted)]">
      <Loader2 className="animate-spin text-[var(--coral)]" size={32} />
      {label ? <p className="text-[13px]">{label}</p> : null}
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="flex items-center gap-2.5 sb-outline rounded-[18px] bg-[var(--coral-soft)] text-[#c4302e] p-3.5 mb-3">
      <AlertCircle size={22} className="shrink-0" />
      <p className="flex-1 text-[14px] font-bold leading-5">{message}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="text-[14px] font-extrabold">
          Coba lagi
        </button>
      ) : null}
    </div>
  );
}

export function Celebrate({ icon = "star", title, body }: { icon?: string; title: string; body?: string }) {
  return (
    <div className="sb-pop flex flex-col items-center gap-3 py-6 text-center">
      <div className="size-[150px] rounded-full bg-[var(--yellow)] sb-hard grid place-items-center">
        <Icon name={icon} size={84} />
      </div>
      <p className="sb-display text-[34px]">{title}</p>
      {body ? <p className="text-[15px] font-bold text-[var(--muted)]">{body}</p> : null}
    </div>
  );
}

export function Body({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("max-w-[640px] mx-auto px-4 pt-4 pb-28 md:px-8 md:pt-6 md:pb-12", className)}>{children}</div>;
}

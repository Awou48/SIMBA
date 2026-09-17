import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Check, ChevronDown, Plus, Smile } from "lucide-react";
import { useChildren } from "../../app/ChildContext";
import { formatAgeId } from "../../lib/id";
import { cn } from "../../app/components/ui/utils";

export function Avatar({ gender, size = 42 }: { gender: "male" | "female"; size?: number }) {
  return (
    <span className={cn("rounded-full sb-outline grid place-items-center text-white shrink-0", gender === "female" ? "bg-[var(--coral)]" : "bg-[var(--teal)]")} style={{ width: size, height: size }}>
      <Smile size={size * 0.55} />
    </span>
  );
}

export function ChildSwitcher() {
  const { children, activeChild, setActiveChild } = useChildren();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!activeChild) return null;

  return (
    <div ref={ref} className="relative mb-3">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Ganti anak" aria-expanded={open} className="w-full sb-hard-sm sb-press-sm rounded-[18px] bg-white flex items-center gap-3 p-3 text-left">
        <Avatar gender={activeChild.gender} />
        <span className="flex-1 min-w-0">
          <span className="block text-[16px] font-extrabold">{activeChild.name}</span>
          <span className="block text-[13px] text-[var(--muted)]">{formatAgeId(activeChild.birth_date)}</span>
        </span>
        {children.length > 1 ? (
          <span className="flex items-center gap-0.5 text-[13px] font-extrabold text-[var(--coral)]">
            Ganti anak <ChevronDown size={18} />
          </span>
        ) : (
          <ChevronDown size={18} className="text-[var(--muted)]" />
        )}
      </button>
      {open ? (
        <div className="absolute z-30 left-0 right-0 mt-2 sb-hard rounded-[20px] bg-[var(--cream)] p-3">
          <p className="sb-display text-[17px] mb-2 px-1">Anak siapa yang ingin dilihat?</p>
          {children.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => {
                setActiveChild(c.id);
                setOpen(false);
              }}
              className={cn("w-full sb-outline rounded-[16px] flex items-center gap-3 p-3 mb-2 text-left", c.id === activeChild.id ? "bg-[var(--yellow-soft)]" : "bg-white")}
            >
              <Avatar gender={c.gender} size={40} />
              <span className="flex-1 min-w-0">
                <span className="block text-[15px] font-extrabold">{c.name}</span>
                <span className="block text-[13px] text-[var(--muted)]">
                  {formatAgeId(c.birth_date)}
                  {c.region ? ` · ${c.region}` : ""}
                </span>
              </span>
              {c.id === activeChild.id ? <Check size={22} className="text-[var(--green)]" /> : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              navigate("/tambah-anak");
            }}
            className="w-full flex items-center gap-3 p-2 text-[15px] font-extrabold text-[var(--coral)]"
          >
            <span className="size-10 rounded-full sb-outline bg-[var(--coral-soft)] grid place-items-center">
              <Plus size={20} />
            </span>
            Tambah anak
          </button>
        </div>
      ) : null}
    </div>
  );
}

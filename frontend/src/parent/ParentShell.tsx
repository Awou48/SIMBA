import { useEffect } from "react";
import { NavLink, Navigate, Outlet, useLocation } from "react-router";
import { Home, Ruler, Utensils, Puzzle, LayoutGrid } from "lucide-react";
import { useChildren } from "../app/ChildContext";
import { cn } from "../app/components/ui/utils";
import logoMark from "../imports/logo_mark.png";
import { Loading } from "./components/ui";

const TABS = [
  { to: "/beranda", label: "Beranda", Icon: Home },
  { to: "/tumbuh", label: "Tumbuh", Icon: Ruler },
  { to: "/makan", label: "Makan", Icon: Utensils },
  { to: "/kembang", label: "Kembang", Icon: Puzzle },
  { to: "/lainnya", label: "Lainnya", Icon: LayoutGrid },
];

export function ParentShell() {
  const { children, isLoading } = useChildren();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.lang = "id";
    document.title = "SIMBA";
  }, []);

  if (isLoading) return <div className="sb"><Loading label="Menyiapkan…" /></div>;
  if (children.length === 0 && location.pathname !== "/tambah-anak") return <Navigate to="/tambah-anak?first=1" replace />;

  return (
    <div className="sb md:flex min-h-screen">
      <aside className="hidden md:flex flex-col w-[240px] shrink-0 bg-[var(--yellow)] border-r-2 border-[var(--ink)] sticky top-0 h-screen p-5">
        <div className="flex items-center gap-3 mb-8">
          <div className="size-12 rounded-2xl bg-white sb-outline grid place-items-center">
            <img src={logoMark} alt="SIMBA" className="size-10 object-contain" />
          </div>
          <div>
            <p className="sb-display text-[22px] leading-6">SIMBA</p>
            <p className="text-[12px] font-bold text-[var(--header-sub)]">Untuk orang tua</p>
          </div>
        </div>
        <nav className="flex flex-col gap-1.5">
          {TABS.map(({ to, label, Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => cn("flex items-center gap-3 px-4 py-3 rounded-full text-[15px] font-extrabold sb-press-sm", isActive ? "bg-[var(--ink)] text-[var(--yellow)]" : "hover:bg-white/60")}>
              <Icon size={20} /> {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto text-[12px] font-bold text-[var(--header-sub)]">Pantau tumbuh kembang si kecil dengan tenang.</p>
      </aside>

      <main className="flex-1 min-w-0">
        <Outlet />
      </main>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t-2 border-[var(--ink)] flex px-2 pt-2 pb-[max(10px,env(safe-area-inset-bottom))]">
        {TABS.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className="flex-1 flex flex-col items-center gap-1 text-[12px] font-extrabold">
            {({ isActive }) => (
              <>
                <span className={cn("w-[46px] h-8 rounded-full grid place-items-center border-2", isActive ? "bg-[var(--yellow)] border-[var(--ink)]" : "border-transparent text-[var(--muted)]")}>
                  <Icon size={22} />
                </span>
                <span className={isActive ? "" : "text-[var(--muted)]"}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

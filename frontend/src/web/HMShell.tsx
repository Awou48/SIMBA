import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import {
  LayoutDashboard, Users, Map, LineChart, Salad, Apple, Flag, BookOpen, Settings, LogOut, Menu, X, ExternalLink, Crown, Stethoscope, type LucideIcon,
} from "lucide-react";
import logo2 from "../imports/logo_2.png";
import { API_URL, api, session, type AdminInfo } from "../lib/api";
import { cn } from "../app/components/ui/utils";
import { Button } from "../app/components/ui/button";
import "../styles/portal.css";

const NAV: { to: string; label: string; icon: LucideIcon; group: string }[] = [
  { to: "/hm/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "Monitor" },
  { to: "/hm/children", label: "Children", icon: Users, group: "Monitor" },
  { to: "/hm/regions", label: "Regions", icon: Map, group: "Monitor" },
  { to: "/hm/growth-standards", label: "WHO Standards", icon: LineChart, group: "Reference" },
  { to: "/hm/akg-targets", label: "AKG Targets", icon: Salad, group: "Reference" },
  { to: "/hm/food-database", label: "Food Database", icon: Apple, group: "Reference" },
  { to: "/hm/milestones", label: "KPSP Milestones", icon: Flag, group: "Reference" },
  { to: "/hm/education", label: "Education", icon: BookOpen, group: "Content" },
  { to: "/hm/system", label: "System", icon: Settings, group: "Admin" },
];

export function HMShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const [me, setMe] = useState<AdminInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    api.admin.me().then(setMe).catch(() => setMe(null));
  }, []);

  // Close the mobile drawer on navigation.
  useEffect(() => setOpen(false), [location.pathname]);

  const logout = () => {
    session.clear();
    navigate("/hm/login", { replace: true });
  };

  const groups = Array.from(new Set(NAV.map((n) => n.group)));
  const current = NAV.find((n) => location.pathname.startsWith(n.to));

  const sidebar = (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="size-9 rounded-lg bg-white/90 flex items-center justify-center shrink-0">
          <img src={logo2} alt="SIMBA" className="size-7 object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-extrabold leading-tight">SIMBA</p>
          <p className="text-[11px] opacity-70 leading-tight">Health Manager Portal</p>
        </div>
        <button className="ml-auto lg:hidden opacity-70 hover:opacity-100" onClick={() => setOpen(false)} aria-label="Close menu"><X size={18} /></button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {groups.map((g) => (
          <div key={g}>
            <p className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider opacity-50">{g}</p>
            <ul className="space-y-0.5">
              {NAV.filter((n) => n.group === g).map(({ to, label, icon: Icon }) => (
                <li key={to}>
                  <NavLink
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors",
                        isActive ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm" : "opacity-80 hover:opacity-100 hover:bg-sidebar-accent",
                      )
                    }
                  >
                    <Icon size={17} /> {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-full bg-sidebar-accent flex items-center justify-center shrink-0">
            {me?.is_superadmin ? <Crown size={16} /> : <Stethoscope size={16} />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold truncate">{me?.name ?? "…"}</p>
            <p className="text-[11px] opacity-70 truncate">{me ? (me.is_superadmin ? "Superadmin" : "Health Manager") : ""}</p>
          </div>
          <button onClick={logout} className="opacity-70 hover:opacity-100" title="Log out" aria-label="Log out"><LogOut size={17} /></button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="hm-portal min-h-screen bg-background text-foreground flex">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{sidebar}</aside>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 shadow-2xl">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-30 h-16 border-b bg-background/85 backdrop-blur flex items-center gap-3 px-4 md:px-8">
          <button className="lg:hidden rounded-md border p-2" onClick={() => setOpen(true)} aria-label="Open menu"><Menu size={18} /></button>
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground leading-none">Health Manager Portal</p>
            <p className="font-bold leading-tight truncate">{current?.label ?? "SIMBA"}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`${API_URL}/docs`} target="_blank" rel="noreferrer"><ExternalLink size={14} /> API docs</a>
            </Button>
            <Button variant="ghost" size="sm" onClick={logout}><LogOut size={14} /> Log out</Button>
          </div>
        </header>
        <main className="flex-1 px-4 md:px-8 py-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
        <footer className="px-4 md:px-8 py-4 text-[11px] text-muted-foreground border-t">
          SIMBA · WHO Child Growth Standards · Permenkes 2/2020 · AKG 2019. Aggregated data for programme monitoring; not a substitute for clinical assessment.
        </footer>
      </div>
    </div>
  );
}

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, errorMessage, session, type Child } from "../lib/api";
import { useAuth } from "./auth";

interface ChildState {
  children: Child[];
  active: Child | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  select: (id: number) => Promise<void>;
  add: (data: { name: string; gender: Child["gender"]; birth_date: string; region?: string | null }) => Promise<Child>;
  update: (id: number, data: Partial<Pick<Child, "name" | "gender" | "birth_date" | "region">>) => Promise<Child>;
}

const ChildContext = createContext<ChildState | null>(null);

export function ChildProvider({ children: kids }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [list, setList] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [rows, stored] = await Promise.all([api.listChildren(), session.getActiveChildId()]);
      setList(rows);
      const chosen = rows.find((c) => c.id === stored)?.id ?? rows[0]?.id ?? null;
      setActiveId(chosen);
      await session.setActiveChildId(chosen);
    } catch (err) {
      setError(errorMessage(err, "Data anak belum bisa dimuat."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) refresh();
    else {
      setList([]);
      setActiveId(null);
      setLoading(false);
    }
  }, [isAuthenticated, refresh]);

  const select = useCallback(async (id: number) => {
    setActiveId(id);
    await session.setActiveChildId(id);
  }, []);

  const add = useCallback<ChildState["add"]>(async (data) => {
    const created = await api.createChild(data);
    setList((p) => [...p, created]);
    setActiveId(created.id);
    await session.setActiveChildId(created.id);
    return created;
  }, []);

  const update = useCallback<ChildState["update"]>(async (id, data) => {
    const saved = await api.updateChild(id, data);
    setList((p) => p.map((c) => (c.id === id ? saved : c)));
    return saved;
  }, []);

  const value = useMemo<ChildState>(
    () => ({ children: list, active: list.find((c) => c.id === activeId) ?? null, loading, error, refresh, select, add, update }),
    [list, activeId, loading, error, refresh, select, add, update],
  );
  return <ChildContext.Provider value={value}>{kids}</ChildContext.Provider>;
}

export function useChildren(): ChildState {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChildren must be used inside ChildProvider");
  return ctx;
}

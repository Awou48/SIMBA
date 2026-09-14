import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, session, type Child } from "../lib/api";

interface ChildContextValue {
  children: Child[];
  activeChild: Child | null;
  isLoading: boolean;
  error: string;
  setActiveChild: (id: number) => void;
  refresh: () => Promise<void>;
}

const ChildContext = createContext<ChildContextValue | null>(null);

/**
 * Loads the parent's children once and remembers which one is "active" across
 * screens (persisted in localStorage so a reload keeps the selection).
 */
export function ChildProvider({ children: content }: { children: React.ReactNode }) {
  const [list, setList] = useState<Child[]>([]);
  const [activeId, setActiveId] = useState<number | null>(session.getActiveChildId());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session.getToken()) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError("");
    try {
      const data = await api.parent.listChildren();
      setList(data);
      // Fall back to the first child if nothing (or something stale) is selected.
      setActiveId((prev) => {
        const stillExists = prev !== null && data.some((c) => c.id === prev);
        const next = stillExists ? prev : data[0]?.id ?? null;
        session.setActiveChildId(next);
        return next;
      });
    } catch (err: any) {
      setError(err?.message ?? "Failed to load child profiles.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const setActiveChild = useCallback((id: number) => {
    session.setActiveChildId(id);
    setActiveId(id);
  }, []);

  const value = useMemo<ChildContextValue>(
    () => ({
      children: list,
      activeChild: list.find((c) => c.id === activeId) ?? null,
      isLoading,
      error,
      setActiveChild,
      refresh,
    }),
    [list, activeId, isLoading, error, setActiveChild, refresh],
  );

  return <ChildContext.Provider value={value}>{content}</ChildContext.Provider>;
}

export function useChildren(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error("useChildren must be used inside <ChildProvider>");
  return ctx;
}

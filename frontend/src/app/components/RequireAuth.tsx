import React, { useEffect } from "react";
import { Navigate, useLocation, useNavigate } from "react-router";
import { session, UNAUTHORIZED_EVENT, type Role } from "../../lib/api";

/**
 * Guards a route subtree: redirects to /login when there is no token for the
 * required role, and reacts to the API client's 401 broadcast.
 */
export function RequireAuth({ role, children, loginPath = "/login" }: { role: Role; children: React.ReactNode; loginPath?: string }) {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const onUnauthorized = () => navigate(loginPath, { replace: true, state: { from: location.pathname } });
    window.addEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(UNAUTHORIZED_EVENT, onUnauthorized);
  }, [navigate, location.pathname, loginPath]);

  if (!session.isLoggedInAs(role)) {
    return <Navigate to={loginPath} replace state={{ from: location.pathname }} />;
  }
  return <>{children}</>;
}

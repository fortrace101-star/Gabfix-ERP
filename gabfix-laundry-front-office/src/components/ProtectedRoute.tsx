import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { laundryApi } from "@/lib/api";

/**
 * Guards staff-only pages: without a stored API token the visitor is
 * redirected to the sign-in page, preserving the attempted location.
 * Replaces the TanStack `_authenticated` beforeLoad gate.
 */
export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();

  if (!laundryApi.auth.isAuthenticated()) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  return children;
}

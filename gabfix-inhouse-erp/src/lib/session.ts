import { useEffect, useState } from "react";
import { portalApi, type EmployeeSession } from "@/lib/api";

/**
 * Live-data slice (plan A6): resolves the signed-in employee from the server
 * (GET /auth/me, fresh from the DB) for the portal shell's identity surfaces.
 */
export function useSession(): EmployeeSession | null {
  const [session, setSession] = useState<EmployeeSession | null>(null);

  useEffect(() => {
    let alive = true;
    portalApi.auth.me().then((user) => {
      if (alive) setSession(user);
    });
    return () => {
      alive = false;
    };
  }, []);

  return session;
}

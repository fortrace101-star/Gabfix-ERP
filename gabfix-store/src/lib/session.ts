import { useEffect, useState } from "react";
import { storeApi, type StaffSession } from "@/lib/api";

/** Live-data slice (plan A6): resolves the signed-in storekeeper from the
 *  server (GET /auth/me, fresh from the DB) for the store shell's identity
 *  surfaces (topbar + sidebar profile). */
export function useSession(): StaffSession | null {
  const [session, setSession] = useState<StaffSession | null>(null);

  useEffect(() => {
    let alive = true;
    storeApi.auth.me().then((user) => {
      if (alive) setSession(user);
    });
    return () => {
      alive = false;
    };
  }, []);

  return session;
}

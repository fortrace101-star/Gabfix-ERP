import { useEffect, useState } from "react";
import { laundryApi, type StaffSession } from "@/lib/api";

/** Live-data slice (plan A6): resolves the signed-in laundry operator from
 *  the server (GET /auth/me, fresh from the DB) for the front office shell's
 *  identity surfaces (sidebar profile + overview greeting). */
export function useSession(): StaffSession | null {
  const [session, setSession] = useState<StaffSession | null>(null);

  useEffect(() => {
    let alive = true;
    laundryApi.auth.me().then((user) => {
      if (alive) setSession(user);
    });
    return () => {
      alive = false;
    };
  }, []);

  return session;
}

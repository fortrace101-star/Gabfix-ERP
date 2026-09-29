const ACCESS_TOKEN_KEY = "gabfix-laundry:auth-token";
const REFRESH_TOKEN_KEY = "gabfix-laundry:refresh-token";

/** Employee identity returned by the server API after login (canonical shape). */
export type StaffSession = {
  id: string;
  name: string;
  role: string;
  app_scope: string[];
};

type TokenPair = { accessToken: string; refreshToken: string; user: StaffSession };

export const laundryApi = {
  baseUrl: import.meta.env["VITE_API_BASE_URL"] ?? "",
  appId: import.meta.env["VITE_APP_ID"] ?? "laundry",
  isConfigured: Boolean(import.meta.env["VITE_API_BASE_URL"]),

  async request<T>(path: string, init?: RequestInit): Promise<T> {
    if (!this.baseUrl) throw new Error("The Gabfix API is not configured yet (set VITE_API_BASE_URL).");
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": this.appId,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init?.headers,
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Gabfix API request failed (${response.status}): ${body}`);
    }
    return response.json() as Promise<T>;
  },

  /**
   * Replays a request once with a refreshed access token after a 401.
   * Internal helper — callers pass the original path/init and a parse fn.
   */
  async requestWithRefresh<T>(
    path: string,
    init: RequestInit | undefined,
    parse: (response: Response) => Promise<T>,
  ): Promise<T> {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token || !this.baseUrl) return this.request<T>(path, init);
    const probe = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": this.appId,
        Authorization: `Bearer ${token}`,
        ...init?.headers,
      },
    });
    if (probe.status !== 401) return parse(probe);
    const refreshed = await this.auth.refresh();
    if (!refreshed) {
      // Refresh failed — surface the original 401 body as the error.
      const body = await probe.text().catch(() => "");
      throw new Error(`Gabfix API request failed (401): ${body}`);
    }
    const retry = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        "X-App-Id": this.appId,
        Authorization: `Bearer ${localStorage.getItem(ACCESS_TOKEN_KEY)}`,
        ...init?.headers,
      },
    });
    return parse(retry);
  },

  /**
   * Employee authentication against the Gabfix server API.
   * Canonical contract: POST /api/auth/login → {accessToken, refreshToken, user}.
   * Staff accounts are admin-created — there is no sign-up.
   */
  auth: {
    async login(identifier: string, password: string): Promise<StaffSession> {
      const body = await laundryApi.request<TokenPair>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ identifier, password }),
      });
      localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, body.refreshToken);
      return body.user;
    },

    /** Exchanges the stored refresh token for a fresh pair; null when expired. */
    async refresh(): Promise<StaffSession | null> {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!refreshToken || !laundryApi.baseUrl) return null;
      try {
        const response = await fetch(`${laundryApi.baseUrl}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-App-Id": laundryApi.appId },
          body: JSON.stringify({ refreshToken }),
        });
        if (!response.ok) {
          laundryApi.auth.signOut();
          return null;
        }
        const body = (await response.json()) as TokenPair;
        localStorage.setItem(ACCESS_TOKEN_KEY, body.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, body.refreshToken);
        return body.user;
      } catch {
        return null;
      }
    },

    async me(): Promise<StaffSession | null> {
      try {
        const body = await laundryApi.request<{ user: StaffSession }>("/auth/me");
        return body.user;
      } catch {
        return null;
      }
    },

    async signOut(): Promise<void> {
      try {
        await laundryApi.request("/auth/logout", { method: "POST", body: JSON.stringify({}) });
      } catch {
        /* stateless tokens: discarding them locally is always sufficient */
      }
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },

    isAuthenticated() {
      return Boolean(localStorage.getItem(ACCESS_TOKEN_KEY));
    },
  },

  /**
   * Authenticated GET that transparently refreshes once on 401 before failing.
   */
  async get<T>(path: string): Promise<T> {
    return this.requestWithRefresh<T>(path, undefined, async (response) => {
      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Gabfix API request failed (${response.status}): ${body}`);
      }
      return response.json() as Promise<T>;
    });
  },
};

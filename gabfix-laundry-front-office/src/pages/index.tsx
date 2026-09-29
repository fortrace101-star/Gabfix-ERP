import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { laundryApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/lib/use-document-title";

function AuthPage() {
  useDocumentTitle(
    "Sign in — Gabfix Laundry Front Office",
    "Secure access to Gabfix laundry orders, collections, stock, and expenses.",
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Return the staff member to the page they originally requested (set by
  // ProtectedRoute), accepting only internal paths to prevent open redirects.
  const from = (location.state as { from?: string } | null)?.from;
  const redirectTarget =
    from && from.startsWith("/") && !from.startsWith("//") ? from : "/dashboard/overview";

  useEffect(() => {
    if (laundryApi.auth.isAuthenticated()) {
      navigate(redirectTarget, { replace: true });
    }
  }, [navigate, redirectTarget]);

  // Staff accounts are created in the Admin Console — there is no self sign-up.
  // The identifier accepts the employee's name or email, per the server contract.
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setLoading(true);
    setMessage("");
    const identifier = String(formData.get("identifier"));
    const password = String(formData.get("password"));
    try {
      await laundryApi.auth.login(identifier, password);
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Authentication failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen bg-auth md:grid-cols-[minmax(0,1fr)_520px]">
      <section className="hidden flex-col justify-between p-12 md:flex">
        <div className="flex items-center gap-3">
          <img src="/gabfix-logo.png" className="h-14 w-14" alt="Gabfix" />
          <div>
            <p className="text-xl font-bold">Gabfix</p>
            <p className="text-xs font-semibold uppercase tracking-wider text-primary">
              Laundry Front Office
            </p>
          </div>
        </div>
        <div className="max-w-xl">
          <p className="mb-5 text-sm font-semibold uppercase tracking-widest text-primary">
            Counter & facility operations
          </p>
          <h1 className="text-5xl font-bold leading-tight">
            Every order tracked.
            <br />
            Every handover accounted for.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground">
            Keep laundry intake, garment progress, stock, and facility expenses moving—even when the
            connection does not.
          </p>
        </div>
        <p className="text-xs text-muted-foreground">Gabfix Home Solutions · Kampala</p>
      </section>

      <section className="flex items-center justify-center border-l border-border bg-card p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <img src="/gabfix-logo.png" className="h-12 w-12" alt="Gabfix" />
            <strong>Gabfix Laundry</strong>
          </div>
          <p className="text-sm font-semibold text-primary">STAFF ACCESS</p>
          <h2 className="mt-2 text-3xl font-bold">Welcome back</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Use your authorised Gabfix account to continue. Accounts are issued by the Admin
            Console.
          </p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            <label className="field-label">
              Name or email
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="identifier"
                  required
                  className="pl-9"
                  placeholder="Grace Atim"
                  autoComplete="username"
                />
              </div>
            </label>
            <label className="field-label">
              Password
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  name="password"
                  type={show ? "text" : "password"}
                  required
                  className="px-9"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  aria-label={show ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  onClick={() => setShow(!show)}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </label>
            {message && (
              <p className="rounded-md border border-border bg-muted p-3 text-sm">{message}</p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? <LoaderCircle className="animate-spin" /> : null}
              Sign in
            </Button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default AuthPage;

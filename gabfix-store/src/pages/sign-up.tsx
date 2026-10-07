import { Eye, EyeOff, KeyRound, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { storeApi, type InviteValidation } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useDocumentTitle } from "@/lib/use-document-title";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState, type FormEvent } from "react";

export default function SignUpPage() {
  useDocumentTitle(
    "Create your account — Gabfix Store",
    "Sign up with the Admin code issued by the Admin Console.",
  );
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inviteCode, setInviteCode] = useState("");
  const [invite, setInvite] = useState<InviteValidation | null>(null);
  const [codeError, setCodeError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  const from = (location.state as { from?: string } | null)?.from;
  const redirectTarget = from && from.startsWith("/") && !from.startsWith("//") ? from : "/";

  useEffect(() => {
    if (storeApi.auth.isAuthenticated()) navigate(redirectTarget, { replace: true });
  }, [navigate, redirectTarget]);

  async function validateCode(e: FormEvent) {
    e.preventDefault();
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 3) {
      setCodeError("Enter a valid Admin code.");
      return;
    }
    setValidating(true);
    setCodeError("");
    try {
      const res = await storeApi.auth.validateInvite(code);
      if (res.valid) setInvite(res);
      else setCodeError("That code is not valid.");
    } catch {
      setCodeError("Invalid, expired, or already-used code.");
    } finally {
      setValidating(false);
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setMessage("");
    if (!invite) {
      setMessage("Validate your Admin code first.");
      return;
    }
    if (form.name.trim().length < 2) {
      setMessage("Enter your full name.");
      return;
    }
    if (form.password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    setSubmitting(true);
    try {
      await storeApi.auth.signUp({
        inviteCode: inviteCode.trim().toUpperCase(),
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      navigate(redirectTarget, { replace: true });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create account.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <section className="w-full max-w-sm">
        <p className="text-sm font-semibold text-primary">STOREKEEPER ACCESS</p>
        <h2 className="mt-2 text-3xl font-bold">Create your account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign up with the Admin code issued by the Admin Console. Your access matches the code
          exactly — you cannot grant yourself extra apps.
        </p>

        {!invite ? (
          <form onSubmit={validateCode} className="mt-8 space-y-4">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Admin code (invite)</span>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                  required
                  minLength={3}
                  className="pl-9 font-mono uppercase"
                  placeholder="e.g. F2PEWYZC"
                  autoComplete="one-time-code"
                />
              </div>
            </label>
            {codeError && (
              <p className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {codeError}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={validating}>
              {validating ? <LoaderCircle className="animate-spin" /> : null}
              {validating ? "Validating…" : "Validate code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-8 space-y-4">
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                Granted access
              </p>
              <p className="mt-1 text-sm">
                Role: <span className="font-medium">{invite.role}</span>
              </p>
              <p className="mt-1 text-sm">
                Apps: <span className="font-medium">{invite.app_scope.join(", ") || "none"}</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Fixed by your code — you cannot add apps here.
              </p>
            </div>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Full name</span>
              <div className="relative">
                <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  minLength={2}
                  className="pl-9"
                  placeholder="Grace Atim"
                  autoComplete="name"
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Email</span>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="pl-9"
                placeholder="grace@home.local"
                autoComplete="email"
              />
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-foreground">Password</span>
              <div className="relative">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type={show ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  required
                  minLength={6}
                  className="px-9"
                  autoComplete="new-password"
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
            <Button type="submit" size="lg" className="w-full" disabled={submitting}>
              {submitting ? <LoaderCircle className="animate-spin" /> : null}
              {submitting ? "Creating account…" : "Create account"}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/auth" className="font-medium text-primary hover:underline">
            Already have an account? Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

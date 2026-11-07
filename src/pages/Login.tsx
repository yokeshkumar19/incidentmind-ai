import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowRight,
  BrainCircuit,
  Database,
  Lock,
  Mail,
  Sparkles,
  User,
  Zap,
  KeyRound,
  CheckCircle2,
} from "lucide-react";
import { useApp } from "../app/state";
import { api } from "../api/client";

export function Login() {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<"register" | "login" | "forgot" | "reset">("register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { loginUser, setAsGuest, toast } = useApp();
  const navigate = useNavigate();

  // Auto-detect reset_token or invite from URL params
  useEffect(() => {
    const tokenParam = searchParams.get("reset_token");
    const emailParam = searchParams.get("email");
    const inviteParam = searchParams.get("invite");

    if (tokenParam) {
      setResetToken(tokenParam);
      if (emailParam) setEmail(emailParam);
      setMode("reset");
      toast("Enter your new password below");
    } else if (inviteParam) {
      if (emailParam) setEmail(emailParam);
      setMode("register");
      toast(`Accepting invitation for code ${inviteParam}`);
    }
  }, [searchParams, toast]);

  const handleQuickFill = async (userName: string, userEmail: string) => {
    setName(userName);
    setEmail(userEmail);
    setPassword("incidentmind123");
    setError(null);
    setLoading(true);
    try {
      const loginRes = await api.auth.login({ email: userEmail, password: "incidentmind123" });
      await loginUser(loginRes.access_token, loginRes.user);
      toast(`Signed in as ${loginRes.user.name}`);
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Failed to log in with demo account.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestEntry = () => {
    setAsGuest();
    toast("Welcome! Entered as Guest");
    navigate("/");
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.forgotPassword(email.trim());
      setSuccessMsg(res.message || "Password reset instructions sent to your email!");
      setMode("reset");
      toast("Password reset instructions dispatched!");
    } catch (err: any) {
      setError(err.message || "Failed to process password reset request.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken.trim()) {
      setError("Please enter the password reset code from your email.");
      return;
    }
    if (newPassword.length < 6) {
      setError("New password must be at least 6 characters.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await api.auth.resetPassword({
        token: resetToken.trim(),
        new_password: newPassword,
      });
      toast(res.message || "Password updated successfully!");
      setSuccessMsg("Password updated successfully. You can now sign in.");
      setPassword(newPassword);
      setMode("login");
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Link may have expired.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "register") {
        if (!name.trim()) throw new Error("Please enter your name.");
        if (!email.trim() || !email.includes("@")) throw new Error("Please enter a valid Gmail / Email.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");

        try {
          const res = await api.auth.register({ name: name.trim(), email: email.trim(), password });
          await loginUser(res.access_token, res.user);
          toast(`Welcome to IncidentMind, ${res.user.name}!`);
          navigate("/");
          return;
        } catch (regErr: any) {
          if (regErr.message?.toLowerCase().includes("already exists")) {
            const loginRes = await api.auth.login({ email: email.trim(), password });
            await loginUser(loginRes.access_token, loginRes.user);
            toast(`Welcome back, ${loginRes.user.name}!`);
            navigate("/");
            return;
          }
          throw regErr;
        }
      } else {
        const res = await api.auth.login({ email: email.trim(), password });
        await loginUser(res.access_token, res.user);
        toast(`Welcome back, ${res.user.name}!`);
        navigate("/");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError")) {
        setError("Unable to connect to backend server at port 8000. Please verify your connection or click 'Continue as Guest' below.");
      } else {
        setError(msg || "Authentication failed. Check your details.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FFF7E8] text-[#171717] dark:bg-[#0B0F19] dark:text-[#F3F4F6] flex flex-col justify-center px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-5xl grid gap-8 lg:grid-cols-2 items-center">
        {/* Left Side: Brand Visual & Architectural Pillars */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <span className="grid size-14 rotate-3 place-items-center rounded-2xl bg-[#FF5A1F] text-white shadow-xl">
              <BrainCircuit size={32} />
            </span>
            <div>
              <h1 className="font-display text-4xl font-black tracking-tight leading-none">
                IncidentMind
              </h1>
              <p className="text-xs font-black uppercase tracking-[.22em] text-[#FF5A1F] mt-1">
                AI / Organizational Memory
              </p>
            </div>
          </div>

          <div className="panel bg-[#3155E7] text-white p-8 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="text-[#D6FF45]" size={22} />
              <span className="text-xs font-black uppercase tracking-wider text-[#D6FF45]">
                Continuous Reliability
              </span>
            </div>
            <h2 className="font-display text-4xl font-black leading-tight">
              Every incident teaches. Every recovery endures.
            </h2>
            <p className="text-sm text-white/80 leading-relaxed font-medium">
              An intelligent command center that reasons across live diagnostic logs and isolated Hindsight memory banks to pinpoint root causes faster.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="panel p-4 flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#FF5A1F]/15 text-[#FF5A1F] shrink-0">
                <Zap size={18} />
              </span>
              <div>
                <b className="text-sm block">Groq AI Reasoning</b>
                <small className="opacity-60 leading-5 block mt-0.5">
                  Deep LLM root-cause investigation powered by openai/gpt-oss-120b.
                </small>
              </div>
            </div>
            <div className="panel p-4 flex items-start gap-3">
              <span className="grid size-9 place-items-center rounded-xl bg-[#6428C8]/15 text-[#6428C8] shrink-0">
                <Database size={18} />
              </span>
              <div>
                <b className="text-sm block">Hindsight Memory</b>
                <small className="opacity-60 leading-5 block mt-0.5">
                  Persistent organizational memory bank for continuous learning.
                </small>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Auth Form Panel */}
        <div className="panel bg-white/90 dark:bg-[#111827]/90 p-8 sm:p-10 shadow-2xl relative border-2 border-black dark:border-white/20">
          {/* Header & Mode Switcher */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">
                {mode === "register"
                  ? "Create Account & Workspace"
                  : mode === "login"
                    ? "Welcome Back"
                    : mode === "forgot"
                      ? "Account Recovery"
                      : "New Credentials"}
              </p>
              {(mode === "forgot" || mode === "reset") ? (
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-bold text-[#3155E7] dark:text-[#D6FF45] hover:underline"
                >
                  &larr; Back to Sign In
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setMode(mode === "register" ? "login" : "register");
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className="text-xs font-bold text-[#3155E7] dark:text-[#D6FF45] hover:underline"
                >
                  {mode === "register" ? "Already have account? Sign in" : "Need account? Register"}
                </button>
              )}
            </div>
            <h2 className="font-display text-3xl font-black mt-1">
              {mode === "register"
                ? "Enter IncidentMind AI"
                : mode === "login"
                  ? "Sign In"
                  : mode === "forgot"
                    ? "Reset Password"
                    : "Set New Password"}
            </h2>
            <p className="text-xs opacity-60 mt-1">
              {mode === "forgot"
                ? "Enter your email address and we'll send you password recovery instructions."
                : mode === "reset"
                  ? "Enter the code received in your email and set your new password."
                  : "Enter your Name, Gmail, and Password to access your reliability cockpit."}
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-5 rounded-2xl bg-[#FF5A1F]/15 border border-[#FF5A1F] p-4 text-xs font-bold text-[#FF5A1F]">
              {error}
            </div>
          )}

          {/* Success Message */}
          {successMsg && (
            <div className="mb-5 rounded-2xl bg-[#2A8F72]/15 border border-[#2A8F72] p-4 text-xs font-bold text-[#2A8F72] flex items-center gap-2">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* FORGOT PASSWORD FORM */}
          {mode === "forgot" && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="label">Your Account Email *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={17} />
                  <input
                    className="field pl-11"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    required
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-4 text-sm mt-3"
              >
                {loading ? "Sending..." : "Send Password Reset Link"}
                <ArrowRight size={17} />
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                  }}
                  className="text-xs opacity-60 hover:opacity-100 underline"
                >
                  Already have a reset code? Enter it here
                </button>
              </div>
            </form>
          )}

          {/* RESET PASSWORD FORM */}
          {mode === "reset" && (
            <div className="space-y-4">
              <div className="p-3.5 bg-amber-500/10 border-2 border-amber-500/30 rounded-xl text-xs space-y-1.5 text-amber-900 dark:text-amber-200">
                <div className="font-bold flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
                  <Mail size={14} /> Check your Inbox and Spam / Junk folder
                </div>
                <p className="opacity-90 leading-relaxed">
                  We sent a 6-digit verification code to <strong>{email || "your email"}</strong>.
                  If you don't see it in your Primary inbox, please check your <strong>Spam / Junk folder</strong> (look for email from <em>IncidentMind AI</em>).
                </p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="label">6-Digit Reset Code *</label>
                  <div className="relative">
                    <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={17} />
                    <input
                      className="field pl-11 font-mono tracking-widest text-base font-bold placeholder:tracking-normal placeholder:font-sans placeholder:text-xs"
                      type="text"
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Enter 6-digit code (e.g. 482915)"
                      maxLength={100}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="label">New Password *</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={17} />
                    <input
                      className="field pl-11"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary w-full justify-center py-4 text-sm mt-3"
                >
                  {loading ? "Updating..." : "Update Password & Sign In"}
                  <ArrowRight size={17} />
                </button>

                <div className="flex items-center justify-between text-xs pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                    }}
                    className="opacity-70 hover:opacity-100 underline"
                  >
                    Change Email / Resend
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("login");
                      setError(null);
                    }}
                    className="opacity-70 hover:opacity-100 underline"
                  >
                    Back to Sign In
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* LOGIN / REGISTER FORM */}
          {(mode === "register" || mode === "login") && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label className="label">Name *</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={17} />
                    <input
                      className="field pl-11"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Maya Chen"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="label">Gmail / Email *</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={17} />
                  <input
                    className="field pl-11"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="yourname@gmail.com"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center">
                  <label className="label">Password *</label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs font-bold text-[#3155E7] dark:text-[#D6FF45] hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 opacity-35" size={17} />
                  <input
                    className="field pl-11"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-4 text-sm mt-5"
              >
                {loading ? "Authenticating..." : mode === "register" ? "Get Started" : "Sign In"}
                <ArrowRight size={17} />
              </button>
            </form>
          )}

          {/* Quick Demo Pre-fill */}
          {(mode === "register" || mode === "login") && (
            <div className="mt-6 border-t border-black/10 dark:border-white/10 pt-4">
              <p className="text-[11px] font-black uppercase tracking-wider opacity-45 mb-2">
                Quick 1-Click Demo Accounts:
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill("Maya Chen", "maya@atlas.dev")}
                  className="rounded-xl border border-black/15 bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs font-bold hover:bg-black/10 transition"
                >
                  Maya Chen (Admin)
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill("Jon Bell", "jon@atlas.dev")}
                  className="rounded-xl border border-black/15 bg-black/5 dark:bg-white/5 px-3 py-1.5 text-xs font-bold hover:bg-black/10 transition"
                >
                  Jon Bell (Engineer)
                </button>
              </div>
            </div>
          )}

          {/* Prominent Guest Option at the Bottom */}
          <div className="mt-8 border-t-2 border-black/10 dark:border-white/10 pt-6">
            <button
              type="button"
              onClick={handleGuestEntry}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-black/30 dark:border-white/30 py-3.5 px-4 text-sm font-black hover:border-black dark:hover:border-white hover:bg-black/5 dark:hover:bg-white/5 transition"
            >
              <span>Continue as Guest</span>
              <ArrowRight size={16} />
            </button>
            <p className="text-[11px] text-center opacity-40 mt-2 font-medium">
              Explore the demo workspace without signing in
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

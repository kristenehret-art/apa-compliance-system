"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("Checking reset link...");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

useEffect(() => {
  async function prepareRecoverySession() {
    const url = new URL(window.location.href);

    const code = url.searchParams.get("code");

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMessage(error.message);
        return;
      }

      window.history.replaceState(null, "", "/reset-password");
      setReady(true);
      setMessage("");
      return;
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.history.replaceState(null, "", "/reset-password");
      setReady(true);
      setMessage("");
      return;
    }

    const { data } = await supabase.auth.getSession();

    if (data.session) {
      setReady(true);
      setMessage("");
      return;
    }

    setMessage(
      "Reset session missing. Please request a new password reset link and open it directly in this browser."
    );
  }

  prepareRecoverySession();
}, [supabase]);

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (!ready) {
      setMessage("Reset session missing. Please request a new reset link.");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password updated. Redirecting to login...");
    setLoading(false);

    setTimeout(() => {
      router.push("/login");
    }, 1200);
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <img src="/apa-logo.png" alt="Artist Protection Alliance" style={logoStyle} />

        <p style={eyebrowStyle}>Account Security</p>
        <h1 style={titleStyle}>Create a new password</h1>

        <p style={subtextStyle}>
          Enter and confirm your new APA member password.
        </p>

        <form onSubmit={handlePasswordUpdate} style={formStyle}>
          <label style={labelStyle}>New Password</label>
          <input
            style={inputStyle}
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password"
            disabled={!ready || loading}
          />

          <label style={labelStyle}>Confirm New Password</label>
          <input
            style={inputStyle}
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            disabled={!ready || loading}
          />

          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={showPasswordButtonStyle}
          >
            {showPassword ? "Hide password" : "Show password"}
          </button>

          <button type="submit" style={buttonStyle} disabled={loading || !ready}>
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>

        {message && <p style={messageStyle}>{message}</p>}
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(255,92,0,0.18), transparent 34%), #050505",
  color: "#ffffff",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "32px 18px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  background: "rgba(18,18,18,0.96)",
  border: "1px solid rgba(255,92,0,0.32)",
  borderRadius: "28px",
  padding: "34px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
};

const logoStyle: React.CSSProperties = {
  width: "120px",
  display: "block",
  margin: "0 auto 22px",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#ff5c00",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "12px",
  fontWeight: 800,
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  fontSize: "34px",
  lineHeight: "1.05",
  textAlign: "center",
  margin: "10px 0 12px",
};

const subtextStyle: React.CSSProperties = {
  color: "#cfcfcf",
  lineHeight: "1.7",
  textAlign: "center",
  marginBottom: "26px",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const labelStyle: React.CSSProperties = {
  fontSize: "13px",
  fontWeight: 800,
  color: "#f2f2f2",
  marginTop: "8px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 15px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "#0b0b0b",
  color: "#ffffff",
  fontSize: "15px",
};

const showPasswordButtonStyle: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "#ff5c00",
  cursor: "pointer",
  fontWeight: 800,
  textAlign: "left",
  padding: "4px 0",
};

const buttonStyle: React.CSSProperties = {
  marginTop: "18px",
  padding: "15px 18px",
  borderRadius: "999px",
  border: "none",
  background: "#ff5c00",
  color: "#ffffff",
  fontWeight: 900,
  fontSize: "15px",
  cursor: "pointer",
};

const messageStyle: React.CSSProperties = {
  marginTop: "18px",
  color: "#ffffff",
  background: "rgba(255,92,0,0.14)",
  border: "1px solid rgba(255,92,0,0.28)",
  padding: "12px",
  borderRadius: "14px",
  lineHeight: "1.5",
};
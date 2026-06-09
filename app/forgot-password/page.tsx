"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleResetRequest(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const redirectTo = `${window.location.origin}/auth/callback?next=/reset-password`;;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    setMessage("Password reset email sent. Check your inbox.");
    setLoading(false);
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <img src="/apa-logo.png" alt="Artist Protection Alliance" style={logoStyle} />

        <p style={eyebrowStyle}>Account Recovery</p>
        <h1 style={titleStyle}>Reset your password</h1>

        <p style={subtextStyle}>
          Enter your email and we’ll send you a secure password reset link.
        </p>

        <form onSubmit={handleResetRequest} style={formStyle}>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
          />

          <button type="submit" style={buttonStyle} disabled={loading}>
            {loading ? "Sending reset link..." : "Send Reset Link"}
          </button>
        </form>

        {message && <p style={messageStyle}>{message}</p>}

        <p style={footerTextStyle}>
          Remembered your password?{" "}
          <a href="/login" style={linkStyle}>
            Back to login
          </a>
        </p>
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

const footerTextStyle: React.CSSProperties = {
  marginTop: "20px",
  textAlign: "center",
  color: "#bdbdbd",
};

const linkStyle: React.CSSProperties = {
  color: "#ff5c00",
  fontWeight: 800,
  textDecoration: "none",
};
"use client";

import { useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function SignupPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [artistName, setArtistName] = useState("");
  const [shopName, setShopName] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      await supabase
        .from("profiles")
        .update({
          artist_name: artistName,
          shop_name: shopName,
          email,
          membership_tier: "free",
          membership_status: "active",
        })
        .eq("id", data.user.id);
    }

    window.location.href = "/";
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <img src="/apa-logo.png" alt="Artist Protection Alliance" style={logoStyle} />

        <p style={eyebrowStyle}>Join Artist Protection Alliance</p>
        <h1 style={titleStyle}>Create your free member account</h1>
        <p style={subtextStyle}>
          Start with free APA tools. Upgrade to Alliance Member later for quote generation,
          dashboard tools, compliance vault access, and posting privileges.
        </p>

        <form onSubmit={handleSignup} style={formStyle}>
          <label style={labelStyle}>Artist Name</label>
          <input
            style={inputStyle}
            value={artistName}
            onChange={(e) => setArtistName(e.target.value)}
          />

          <label style={labelStyle}>Shop Name</label>
          <input
            style={inputStyle}
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
          />

          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <label style={labelStyle}>Password</label>
          <input
            style={inputStyle}
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
          />
<button
  type="button"
  onClick={() => setShowPassword(!showPassword)}
  style={{
    marginTop: "6px",
    background: "none",
    border: "none",
    color: "#ff5c00",
    cursor: "pointer",
    fontSize: "14px",
  }}
>
  {showPassword ? "Hide Password" : "Show Password"}
</button>
          <button style={buttonStyle} type="submit" disabled={loading}>
            {loading ? "Creating account..." : "Create Free Member Account"}
          </button>
        </form>

        {message && <p style={messageStyle}>{message}</p>}

        <p style={footerTextStyle}>
          Already have an account?{" "}
          <a href="/login" style={linkStyle}>
            Log in
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
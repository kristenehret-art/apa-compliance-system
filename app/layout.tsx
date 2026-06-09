"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [membershipTier, setMembershipTier] = useState("free");

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("membership_tier")
        .eq("id", user.id)
        .single();

      if (profile?.membership_tier) {
        setMembershipTier(profile.membership_tier);
      }
    }

    loadProfile();
  }, []);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "sans-serif",
          background: "#050505",
          color: "white",
        }}
      >
        {/* GLOBAL HEADER */}
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 100,
            backdropFilter: "blur(14px)",
            background: "rgba(10,10,10,0.92)",
            borderBottom: "1px solid rgba(255,92,0,0.18)",
            padding: "18px 30px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "18px",
            boxShadow: "0 8px 30px rgba(0,0,0,0.45)",
          }}
        >
          {/* LOGO */}
          <a
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              textDecoration: "none",
            }}
          >
            <img
              src="/apa-logo.png"
              alt="APA"
              style={{
                height: "44px",
                width: "44px",
                objectFit: "contain",
              }}
            />

            <div>
              <div
                style={{
                  color: "#ff5c00",
                  fontWeight: 800,
                  fontSize: "18px",
                  letterSpacing: "1px",
                }}
              >
                ARTIST PROTECTION ALLIANCE
              </div>

              <div
                style={{
                  color: "#8a8a8a",
                  fontSize: "11px",
                  marginTop: "2px",
                  letterSpacing: "2px",
                }}
              >
                YOUR BUSINESS, IN ONE PLACE.
              </div>
            </div>
          </a>

          {/* NAVIGATION */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              alignItems: "center",
              flexWrap: "wrap",
              justifyContent: "flex-end",
            }}
          >

<a href="/calculator" style={navStyle}>
  Calculator
</a>

<a href="/dashboard" style={navStyle}>
  Dashboard
</a>

<a href="/compliance" style={navStyle}>
  Compliance
</a>

<a href="/opportunities" style={navStyle}>
  Opportunities
</a>

<a href="/artists" style={navStyle}>
  Open to Work
</a>

            {membershipTier === "free" && (
              <a href="/pricing" style={activeNavStyle}>
                Alliance
              </a>
            )}

            {membershipTier === "alliance" && (
              <a href="/account" style={activeNavStyle}>
                Account
              </a>
            )}

            {membershipTier === "admin" && (
              <a href="/admin/opportunities" style={navStyle}>
                Admin
              </a>
            )}
          </div>
        </div>

        {/* PAGE CONTENT */}
        <div>{children}</div>
      </body>
    </html>
  );
}

const navStyle = {
  color: "#d0d0d0",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "14px",
  padding: "10px 16px",
  borderRadius: "12px",
  transition: "all 0.2s ease",
  border: "1px solid transparent",
  background: "rgba(255,255,255,0.02)",
};

const activeNavStyle = {
  color: "#fff",
  textDecoration: "none",
  fontWeight: 700,
  fontSize: "14px",
  padding: "10px 16px",
  borderRadius: "12px",
  background: "rgba(255,92,0,0.16)",
  border: "1px solid rgba(255,92,0,0.4)",
  boxShadow: "0 0 20px rgba(255,92,0,0.18)",
};
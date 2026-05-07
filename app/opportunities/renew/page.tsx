"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function RenewOpportunityPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const [error, setError] = useState("");

  async function renewListing() {
    if (!token) {
      setError("Missing renewal token.");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase
      .from("opportunities")
      .update({
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        renewed_at: new Date().toISOString(),
        renewal_reminder_sent: false,
        status: "approved",
      })
      .eq("renewal_token", token);

    setLoading(false);

    if (error) {
      console.error(error);
      setError("This renewal link is invalid or could not be renewed.");
      return;
    }

    setRenewed(true);
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
      <div style={{ maxWidth: "650px", margin: "0 auto", background: "#1a1a1a", padding: "30px", borderRadius: "18px", border: "1px solid #333" }}>
        <h1>Renew Opportunity Listing</h1>

        {renewed ? (
          <>
            <p style={{ color: "#cfcfcf" }}>
              Your listing has been renewed for another 30 days.
            </p>

            <a href="/opportunities" style={{ color: "#d4af37", fontWeight: "bold" }}>
              Back to Opportunity Hub
            </a>
          </>
        ) : (
          <>
            <p style={{ color: "#cfcfcf" }}>
              Click below to keep your opportunity active for another 30 days.
            </p>

            {error && <p style={{ color: "#ff8080" }}>{error}</p>}

            <button
              onClick={renewListing}
              disabled={loading || !token}
              style={{
                background: "#d4af37",
                color: "#111",
                padding: "14px 22px",
                borderRadius: "12px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              {loading ? "Renewing..." : "Renew Listing"}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
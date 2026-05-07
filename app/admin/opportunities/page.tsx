"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function AdminOpportunitiesPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  function unlockAdmin(e: React.FormEvent) {
    e.preventDefault();

    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      setUnlocked(true);
      setLoading(true);
      fetchData();
    } else {
      alert("Incorrect admin password.");
    }
  }

  async function fetchData() {
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      alert("Could not load opportunities: " + error.message);
      console.error(error);
      setLoading(false);
      return;
    }

    setOpportunities(data || []);
    setLoading(false);
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Status update failed: " + error.message);
      return;
    }

    alert(`Listing marked as ${status}.`);
    fetchData();
  }

  async function renewListing(id: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        renewed_at: new Date().toISOString(),
        renewal_reminder_sent: false,
        status: "approved",
      })
      .eq("id", id);

    if (error) {
      alert("Renew failed: " + error.message);
      return;
    }

    alert("Listing renewed for 30 days.");
    fetchData();
  }
  async function toggleFeatured(id: string, currentValue: boolean) {
  const { error } = await supabase
    .from("opportunities")
    .update({ is_featured: !currentValue })
    .eq("id", id);

  if (error) {
    alert("Featured update failed: " + error.message);
    return;
  }

  alert(!currentValue ? "Listing marked as featured." : "Listing removed from featured.");
  fetchData();
}

  async function expireListing(id: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({
        expires_at: new Date().toISOString(),
        status: "expired",
      })
      .eq("id", id);

    if (error) {
      alert("Expire failed: " + error.message);
      return;
    }

    alert("Listing expired.");
    fetchData();
  }

  if (!unlocked) {
    return (
      <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
        <div style={{ maxWidth: "420px", margin: "0 auto", background: "#1a1a1a", padding: "30px", borderRadius: "18px", border: "1px solid #333" }}>
          <h1>APA Admin Login</h1>

          <form onSubmit={unlockAdmin} style={{ display: "grid", gap: "14px" }}>
            <input
              type="password"
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "1px solid #333",
                background: "#111",
                color: "white",
              }}
            />

            <button
              type="submit"
              style={{
                background: "#d4af37",
                color: "#111",
                padding: "14px",
                borderRadius: "12px",
                border: "none",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              Unlock Admin
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
        Loading...
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "36px", marginBottom: "20px" }}>
          APA Admin — Opportunities
        </h1>

        {opportunities.length === 0 ? (
          <p>No opportunities found.</p>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {opportunities.map((item) => (
              <div
                key={item.id}
                style={{
                  background: "#1a1a1a",
                  padding: "20px",
                  borderRadius: "16px",
                  border: "1px solid #333",
                }}
              >
                <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                  {item.category}
                </p>

                <h2>{item.title}</h2>

                <p style={{ color: "#cfcfcf" }}>
                  {item.shop_name || "No shop name"} · {item.city || "No city"}, {item.state || "No state"}
                </p>

                <p style={{ marginTop: "10px" }}>{item.description}</p>

                <p style={{ marginTop: "10px", color: "#999" }}>
                  Status: <strong>{item.status}</strong>
                </p>

                <p style={{ color: "#999" }}>
                  Expires: {item.expires_at ? new Date(item.expires_at).toLocaleString() : "No expiration date"}
                </p>

                <div style={{ display: "flex", gap: "10px", marginTop: "15px", flexWrap: "wrap" }}>
                  <button onClick={() => updateStatus(item.id, "approved")} style={btn("#4caf50", "white")}>
                    Approve
                  </button>

                  <button onClick={() => updateStatus(item.id, "rejected")} style={btn("#e53935", "white")}>
                    Reject
                  </button>

                  <button onClick={() => renewListing(item.id)} style={btn("#d4af37", "#111")}>
                    Renew
                  </button>

                  <button onClick={() => toggleFeatured(item.id, item.is_featured)} style={btn("#d4af37", "#111")}>
  {item.is_featured ? "Unfeature" : "Feature"}
</button>

                  <button onClick={() => expireListing(item.id)} style={btn("#555", "white")}>
                    Expire
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function btn(background: string, color: string) {
  return {
    background,
    color,
    border: "none",
    padding: "10px 14px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "bold",
  };
}
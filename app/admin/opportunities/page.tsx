"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function AdminOpportunitiesPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [artistProfiles, setArtistProfiles] = useState<any[]>([]);
  const [complianceAuditItems, setComplianceAuditItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
const [auditStats, setAuditStats] = useState({
  dueNow: 0,
  needsReview: 0,
  possibleUpdates: 0,
});
const [auditNotesById, setAuditNotesById] = useState<Record<number, string>>({});
  useEffect(() => {
    const savedUnlock = localStorage.getItem("apa_admin_unlocked");

    if (savedUnlock === "true") {
      setUnlocked(true);
      fetchData();
    }
  }, []);

  function unlockAdmin(e: React.FormEvent) {
    e.preventDefault();

    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      localStorage.setItem("apa_admin_unlocked", "true");
      setUnlocked(true);
      setLoading(true);
      fetchData();
    } else {
      alert("Incorrect admin password.");
    }
  }

  function logoutAdmin() {
    localStorage.removeItem("apa_admin_unlocked");
    setUnlocked(false);
    setPassword("");
    setOpportunities([]);
    setArtistProfiles([]);
    setComplianceAuditItems([]);
  }

  async function fetchData() {
    setLoading(true);

    const { data: opportunityData, error: opportunityError } = await supabase
      .from("opportunities")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: artistData, error: artistError } = await supabase
      .from("artist_profiles")
      .select("*")
      .order("created_at", { ascending: false });

    const { data: auditData, error: auditError } = await supabase
      .from("compliance_items")
      .select(
        "id, state, county, name, category, source_url, action_url, action_label, audit_frequency, next_audit_due, audit_status, last_audited_at, audit_notes"
      )
      .or(
        `next_audit_due.lte.${new Date()
          .toISOString()
          .slice(
            0,
            10
          )},audit_status.in.(needs_review,possible_update)`
      )
      .order("next_audit_due", { ascending: true });

    if (opportunityError) {
      alert("Could not load opportunities: " + opportunityError.message);
      console.error(opportunityError);
    }

    if (artistError) {
      alert("Could not load Open to Work profiles: " + artistError.message);
      console.error(artistError);
    }

    if (auditError) {
      alert("Could not load compliance audit queue: " + auditError.message);
      console.error(auditError);
    }

    setOpportunities(opportunityData || []);
    setArtistProfiles(artistData || []);
  setComplianceAuditItems(auditData || []);

const notesMap: Record<number, string> = {};
(auditData || []).forEach((item) => {
  notesMap[item.id] = item.audit_notes || "";
});
setAuditNotesById(notesMap);

setLoading(false);

const audits = auditData || [];

setAuditStats({
  dueNow: audits.filter(
    (item) =>
      item.next_audit_due &&
      new Date(item.next_audit_due) <= new Date()
  ).length,

  needsReview: audits.filter(
    (item) => item.audit_status === "needs_review"
  ).length,

  possibleUpdates: audits.filter(
    (item) => item.audit_status === "possible_update"
  ).length,
});
  }

async function updateComplianceAuditStatus(id: number, status: string) {
  const { data, error } = await supabase.rpc("mark_compliance_audit_item", {
    p_item_id: id,
    p_status: status,
  });

  if (error) {
    alert("Compliance audit update failed: " + error.message);
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    alert("Compliance audit update did not return an updated item.");
    return;
  }

  alert(`Compliance item marked as ${status}.`);
  fetchData();
}
async function saveComplianceAuditNotes(id: number) {
  const note = auditNotesById[id] || "";

  const { data, error } = await supabase.rpc("save_compliance_audit_notes", {
    p_item_id: id,
    p_notes: note,
  });

  if (error) {
    alert("Compliance audit notes failed to save: " + error.message);
    console.error(error);
    return;
  }

  if (!data || data.length === 0) {
    alert("Compliance audit notes did not return an updated item.");
    return;
  }

  alert("Audit notes saved.");
  fetchData();
}
  async function updateOpportunityStatus(id: string, status: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Opportunity status update failed: " + error.message);
      return;
    }

    alert(`Opportunity marked as ${status}.`);
    fetchData();
  }

  async function updateArtistProfileStatus(id: string, status: string) {
    const { error } = await supabase
      .from("artist_profiles")
      .update({ status })
      .eq("id", id);

    if (error) {
      alert("Open to Work status update failed: " + error.message);
      return;
    }

    alert(`Open to Work profile marked as ${status}.`);
    fetchData();
  }

  async function renewListing(id: string) {
    const { error } = await supabase
      .from("opportunities")
      .update({
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        renewed_at: new Date().toISOString(),
        renewal_reminder_sent: false,
        status: "approved",
      })
      .eq("id", id);

    if (error) {
      alert("Renew failed: " + error.message);
      return;
    }

    alert("Opportunity renewed for 30 days.");
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

    alert(
      !currentValue
        ? "Opportunity marked as featured."
        : "Opportunity removed from featured."
    );
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

    alert("Opportunity expired.");
    fetchData();
  }

  if (!unlocked) {
    return (
      <main style={pageStyle}>
        <div style={loginCardStyle}>
          <h1 style={headingStyle}>APA Admin Login</h1>

          <form onSubmit={unlockAdmin} style={{ display: "grid", gap: "14px" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Enter admin password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={inputStyle}
            />

            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              style={btn("#333", "white")}
            >
              {showPassword ? "Hide Password" : "View Password"}
            </button>

            <button type="submit" style={btn("#ff5c00", "#111")}>
              Unlock Admin
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (loading) {
    return <main style={pageStyle}>Loading...</main>;
  }

  return (
    <main style={pageStyle}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <div style={adminHeaderRowStyle}>
          <h1 style={headingStyle}>APA Admin — Moderation</h1>

          <div style={buttonRowStyle}>
            <button onClick={fetchData} style={btn("#ff5c00", "#111")}>
              Refresh Data
            </button>

            <button onClick={logoutAdmin} style={btn("#333", "white")}>
              Logout
            </button>
          </div>
        </div>
<section style={sectionStyle}>
  <h2 style={sectionTitleStyle}>Compliance Audit Summary</h2>

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
      gap: "16px",
    }}
  >
    <div style={cardStyle}>
      <p style={orangeTextStyle}>Due Now</p>
      <h2>{auditStats.dueNow}</h2>
    </div>

    <div style={cardStyle}>
      <p style={orangeTextStyle}>Needs Review</p>
      <h2>{auditStats.needsReview}</h2>
    </div>

    <div style={cardStyle}>
      <p style={orangeTextStyle}>Possible Updates</p>
      <h2>{auditStats.possibleUpdates}</h2>
    </div>
  </div>
</section>
        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Compliance Audit Queue</h2>

          {complianceAuditItems.length === 0 ? (
            <p style={mutedTextStyle}>
              No compliance items are currently overdue or marked for review.
            </p>
          ) : (
            <div style={{ display: "grid", gap: "20px" }}>
              {complianceAuditItems.map((item) => (
                <div key={item.id} style={cardStyle}>
                  <p style={orangeTextStyle}>
                    {item.state || "National"}
                    {item.county ? ` · ${item.county}` : ""}
                  </p>

                  <h2>{item.name}</h2>

                  <p style={mutedTextStyle}>
                    Category: <strong>{item.category || "Uncategorized"}</strong>
                  </p>

                  <p style={mutedTextStyle}>
                    Audit Frequency:{" "}
                    <strong>{item.audit_frequency || "quarterly"}</strong>
                  </p>

                  <p style={mutedTextStyle}>
                    Next Audit Due:{" "}
                    <strong>{item.next_audit_due || "No date set"}</strong>
                  </p>

                  <p style={mutedTextStyle}>
                    Status: <strong>{item.audit_status || "current"}</strong>
                  </p>

                  <p style={mutedTextStyle}>
                    Last Audited:{" "}
                    <strong>
                      {item.last_audited_at
                        ? new Date(item.last_audited_at).toLocaleString()
                        : "Never"}
                    </strong>
                  </p>

                  <div style={{ marginTop: "14px" }}>
  <label style={{ ...orangeTextStyle, display: "block", marginBottom: "8px" }}>
    Audit Notes
  </label>

  <textarea
    value={auditNotesById[item.id] || ""}
    onChange={(e) =>
      setAuditNotesById((prev) => ({
        ...prev,
        [item.id]: e.target.value,
      }))
    }
    placeholder="Document what was reviewed, whether anything changed, and what source was checked."
    style={textareaStyle}
  />

  <button
    onClick={() => saveComplianceAuditNotes(item.id)}
    style={{ ...btn("#333", "white"), marginTop: "10px" }}
  >
    Save Notes
  </button>
</div>

                  <div style={buttonRowStyle}>
                    {item.source_url && (
                      <a
                        href={item.source_url}
                        target="_blank"
                        rel="noreferrer"
                        style={linkButtonStyle}
                      >
                        Review Source
                      </a>
                    )}

                    {item.action_url && (
                      <a
                        href={item.action_url}
                        target="_blank"
                        rel="noreferrer"
                        style={linkButtonStyle}
                      >
                        {item.action_label || "Open Action Link"}
                      </a>
                    )}

                    <button
                      onClick={() =>
                        updateComplianceAuditStatus(item.id, "current")
                      }
                      style={btn("#4caf50", "white")}
                    >
                      Mark Current
                    </button>

                    <button
                      onClick={() =>
                        updateComplianceAuditStatus(item.id, "needs_review")
                      }
                      style={btn("#ff9800", "#111")}
                    >
                      Needs Review
                    </button>

                    <button
                      onClick={() =>
                        updateComplianceAuditStatus(item.id, "updated")
                      }
                      style={btn("#ff5c00", "#111")}
                    >
                      Mark Updated
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Opportunities</h2>

          {opportunities.length === 0 ? (
            <p>No opportunities found.</p>
          ) : (
            <div style={{ display: "grid", gap: "20px" }}>
              {opportunities.map((item) => (
                <div key={item.id} style={cardStyle}>
                  <p style={orangeTextStyle}>{item.category}</p>

                  <h2>{item.title}</h2>

                  <p style={{ color: "#cfcfcf" }}>
                    {item.shop_name || "No shop name"} ·{" "}
                    {item.city || "No city"}, {item.state || "No state"}
                  </p>

                  <p style={{ marginTop: "10px" }}>{item.description}</p>

                  <p style={mutedTextStyle}>
                    Status: <strong>{item.status}</strong>
                  </p>

                  <p style={mutedTextStyle}>
                    Compliance Badge Visible:{" "}
                    <strong>
                      {item.compliance_status_visible ? "Yes" : "No"}
                    </strong>
                  </p>

                  <p style={mutedTextStyle}>
                    Expires:{" "}
                    {item.expires_at
                      ? new Date(item.expires_at).toLocaleString()
                      : "No expiration date"}
                  </p>

                  <div style={buttonRowStyle}>
                    <button
                      onClick={() =>
                        updateOpportunityStatus(item.id, "approved")
                      }
                      style={btn("#4caf50", "white")}
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        updateOpportunityStatus(item.id, "rejected")
                      }
                      style={btn("#e53935", "white")}
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => updateOpportunityStatus(item.id, "hidden")}
                      style={btn("#777", "white")}
                    >
                      Hide
                    </button>

                    <button
                      onClick={() => renewListing(item.id)}
                      style={btn("#ff5c00", "#111")}
                    >
                      Renew
                    </button>

                    <button
                      onClick={() =>
                        toggleFeatured(item.id, item.is_featured)
                      }
                      style={btn("#ff5c00", "#111")}
                    >
                      {item.is_featured ? "Unfeature" : "Feature"}
                    </button>

                    <button
                      onClick={() => expireListing(item.id)}
                      style={btn("#555", "white")}
                    >
                      Expire
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section style={sectionStyle}>
          <h2 style={sectionTitleStyle}>Open to Work Profiles</h2>

          {artistProfiles.length === 0 ? (
            <p>No Open to Work profiles found.</p>
          ) : (
            <div style={{ display: "grid", gap: "20px" }}>
              {artistProfiles.map((artist) => (
                <div key={artist.id} style={cardStyle}>
                  <p style={orangeTextStyle}>
                    {artist.looking_for || "Artist / Piercer Open to Work"}
                  </p>

                  <h2>{artist.artist_name || "Unnamed Artist"}</h2>

                  <p style={{ color: "#cfcfcf" }}>
                    {artist.city || "No city"}, {artist.state || "No state"}
                  </p>

                  <p style={{ marginTop: "10px" }}>
                    {artist.bio || "No bio provided."}
                  </p>

                  {artist.tattoo_styles && (
                    <p style={mutedTextStyle}>
                      Styles / Specialty:{" "}
                      <strong>{artist.tattoo_styles}</strong>
                    </p>
                  )}

                  {artist.email && (
                    <p style={mutedTextStyle}>
                      Email: <strong>{artist.email}</strong>
                    </p>
                  )}

                  {artist.instagram_url && (
                    <p style={mutedTextStyle}>
                      Instagram: <strong>{artist.instagram_url}</strong>
                    </p>
                  )}

                  {artist.portfolio_url && (
                    <p style={mutedTextStyle}>
                      Portfolio: <strong>{artist.portfolio_url}</strong>
                    </p>
                  )}

                  <p style={mutedTextStyle}>
                    Status: <strong>{artist.status}</strong>
                  </p>

                  <p style={mutedTextStyle}>
                    Compliance Badge Visible:{" "}
                    <strong>
                      {artist.compliance_status_visible ? "Yes" : "No"}
                    </strong>
                  </p>

                  <div style={buttonRowStyle}>
                    <button
                      onClick={() =>
                        updateArtistProfileStatus(artist.id, "approved")
                      }
                      style={btn("#4caf50", "white")}
                    >
                      Approve
                    </button>

                    <button
                      onClick={() =>
                        updateArtistProfileStatus(artist.id, "rejected")
                      }
                      style={btn("#e53935", "white")}
                    >
                      Reject
                    </button>

                    <button
                      onClick={() =>
                        updateArtistProfileStatus(artist.id, "hidden")
                      }
                      style={btn("#777", "white")}
                    >
                      Hide
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0f0f0f",
  color: "white",
  padding: "40px",
};

const loginCardStyle = {
  maxWidth: "420px",
  margin: "0 auto",
  background: "#1a1a1a",
  padding: "30px",
  borderRadius: "18px",
  border: "1px solid #333",
};

const headingStyle = {
  fontSize: "36px",
  marginBottom: "20px",
  color: "#ff5c00",
};

const adminHeaderRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "16px",
  flexWrap: "wrap" as const,
};

const sectionStyle = {
  marginTop: "36px",
};

const sectionTitleStyle = {
  color: "#ff5c00",
  fontSize: "28px",
  marginBottom: "18px",
};

const cardStyle = {
  background: "#1a1a1a",
  padding: "20px",
  borderRadius: "16px",
  border: "1px solid #333",
};

const orangeTextStyle = {
  color: "#ff5c00",
  fontWeight: "bold",
};

const mutedTextStyle = {
  marginTop: "10px",
  color: "#999",
};

const buttonRowStyle = {
  display: "flex",
  gap: "10px",
  marginTop: "15px",
  flexWrap: "wrap" as const,
};

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#111",
  color: "white",
  boxSizing: "border-box" as const,
};
const textareaStyle = {
  width: "100%",
  minHeight: "110px",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#111",
  color: "white",
  boxSizing: "border-box" as const,
  resize: "vertical" as const,
};
const linkButtonStyle = {
  background: "#222",
  color: "white",
  border: "1px solid #444",
  padding: "10px 14px",
  borderRadius: "10px",
  cursor: "pointer",
  fontWeight: "bold",
  textDecoration: "none",
};

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
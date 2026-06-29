"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

type AnyRecord = Record<string, any>;

export default function AccountPage() {
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [artistName, setArtistName] = useState("");
  const [shopName, setShopName] = useState("");
  const [membershipTier, setMembershipTier] = useState("free");
  const [professionType, setProfessionType] = useState("tattoo_artist");

  const [openToWorkProfiles, setOpenToWorkProfiles] = useState<AnyRecord[]>([]);
  const [myOpportunities, setMyOpportunities] = useState<AnyRecord[]>([]);
  const [actionMessage, setActionMessage] = useState("");

  async function loadAccountData() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setEmail(user.email || "");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("artist_name, shop_name, membership_tier, profession_type")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) {
        console.error("PROFILE ERROR:", profileError);
      }

      if (profile) {
        setArtistName(profile.artist_name || "");
        setShopName(profile.shop_name || "");
        setMembershipTier(profile.membership_tier || "free");
        setProfessionType(profile.profession_type || "tattoo_artist");
      }

      const { data: artistProfiles, error: artistProfilesError } =
        await supabase
          .from("artist_profiles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (artistProfilesError) {
        console.error("ARTIST PROFILES ERROR:", artistProfilesError);
      } else {
        setOpenToWorkProfiles(artistProfiles || []);
      }

      const { data: opportunities, error: opportunitiesError } =
        await supabase
          .from("opportunities")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (opportunitiesError) {
        console.error("OPPORTUNITIES ERROR:", opportunitiesError);
      } else {
        setMyOpportunities(opportunities || []);
      }
    } catch (err) {
      console.error("ACCOUNT ERROR:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAccountData();
  }, []);

  async function updateProfession(nextProfession: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        profession_type: nextProfession,
      })
      .eq("id", user.id);

    if (error) {
      console.error("PROFESSION UPDATE ERROR:", error);
      return;
    }

    setProfessionType(nextProfession);
  }

async function hideOpenToWorkProfile(id: string) {
  setActionMessage("");

  const { data, error } = await supabase
    .from("artist_profiles")
    .update({ status: "hidden" })
    .eq("id", id)
    .select();

  if (error) {
    console.error("HIDE OPEN TO WORK ERROR:", error);
    setActionMessage("Could not hide this Open to Work profile.");
    return;
  }

  if (!data || data.length === 0) {
    setActionMessage("No Open to Work profile was updated.");
    return;
  }

  setOpenToWorkProfiles((currentProfiles) =>
    currentProfiles.filter((profile) => profile.id !== id)
  );

  setActionMessage("Open to Work profile hidden.");
  await loadAccountData();
}

async function renewOpenToWorkProfile(id: string) {
  setActionMessage("");

  const { data, error } = await supabase
    .from("artist_profiles")
    .update({ status: "pending" })
    .eq("id", id)
    .select();

  if (error) {
    console.error("RENEW OPEN TO WORK ERROR:", error);
    setActionMessage("Could not renew this Open to Work profile.");
    return;
  }

  if (!data || data.length === 0) {
    setActionMessage("No Open to Work profile was renewed.");
    return;
  }

  setActionMessage("Open to Work profile renewed and sent for approval.");
  await loadAccountData();
}

async function deleteOpenToWorkProfile(id: string) {
  const confirmed = window.confirm(
    "Delete this Open to Work profile? This cannot be undone."
  );

  if (!confirmed) return;

  setActionMessage("");

  const { data, error } = await supabase
    .from("artist_profiles")
    .delete()
    .eq("id", id)
    .select();

if (error) {
  console.error("DELETE OPEN TO WORK ERROR:", error);

  alert(
    `Delete failed:\n\n${error.message}\n\n${error.details || ""}`
  );

  setActionMessage(`Delete failed: ${error.message}`);
  return;
}

 if (!data || data.length === 0) {
  alert("Delete affected 0 rows.");

  setActionMessage("No Open to Work profile was deleted.");
  return;
}

  setOpenToWorkProfiles((currentProfiles) =>
    currentProfiles.filter((profile) => profile.id !== id)
  );

  setActionMessage("Open to Work profile deleted.");
  await loadAccountData();
}

  async function hideOpportunity(id: string) {
    setActionMessage("");

    const { error } = await supabase
      .from("opportunities")
      .update({ status: "hidden" })
      .eq("id", id);

    if (error) {
      console.error("HIDE OPPORTUNITY ERROR:", error);
      setActionMessage("Could not hide this opportunity.");
      return;
    }

    setActionMessage("Opportunity hidden.");
    await loadAccountData();
  }

  async function renewOpportunity(id: string) {
    setActionMessage("");

    const { error } = await supabase
      .from("opportunities")
      .update({
        status: "approved",
        expires_at: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(),
        renewed_at: new Date().toISOString(),
        renewal_reminder_sent: false,
      })
      .eq("id", id);

    if (error) {
      console.error("RENEW OPPORTUNITY ERROR:", error);
      setActionMessage("Could not renew this opportunity.");
      return;
    }

    setActionMessage("Opportunity renewed for 30 days.");
    await loadAccountData();
  }

  async function deleteOpportunity(id: string) {
    const confirmed = window.confirm(
      "Delete this opportunity? This cannot be undone."
    );

    if (!confirmed) return;

    setActionMessage("");



const { data, error } = await supabase
  .from("opportunities")
  .delete()
  .eq("id", id)
  .select();

if (error) {
  console.error("DELETE OPPORTUNITY ERROR:", error);
  setActionMessage("Could not delete this opportunity.");
  return;
}

if (!data || data.length === 0) {
  setActionMessage("No opportunity was deleted.");
  return;
  }

   setActionMessage("Opportunity deleted.");
  await loadAccountData();
}

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  function getDisplayTitle(item: AnyRecord, fallback: string) {
    return (
      item.title ||
      item.position_title ||
      item.artist_name ||
      item.name ||
      item.shop_name ||
      fallback
    );
  }

  function getDisplaySubtitle(item: AnyRecord) {
    return (
      item.category ||
      item.opportunity_type ||
      item.position_type ||
      item.location ||
      item.city ||
      item.status ||
      "No details listed"
    );
  }

  if (loading) {
    return (
      <main style={pageStyle}>
        <p style={{ color: "#888" }}>Loading account...</p>
      </main>
    );
  }

  const isAlliance = membershipTier === "alliance" || membershipTier === "admin";

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <img
          src="/apa-logo.png"
          alt="Artist Protection Alliance"
          style={logoStyle}
        />

        <div style={headerBlock}>
          <h1 style={titleStyle}>Account</h1>

          <p style={subtitleStyle}>
            Your membership, profile, listings, and Alliance tools.
          </p>
        </div>

        {actionMessage && <div style={messageBox}>{actionMessage}</div>}

        <div style={statusCard}>
          <div style={statusTopRow}>
            <span style={statusLabel}>Membership Status</span>

            <div
              style={{
                ...statusPill,
                background: isAlliance
                  ? "rgba(255,92,0,0.16)"
                  : "rgba(255,255,255,0.06)",
                border: isAlliance
                  ? "1px solid rgba(255,92,0,0.35)"
                  : "1px solid rgba(255,255,255,0.08)",
                color: isAlliance ? "#ff5c00" : "#999",
              }}
            >
              {isAlliance ? "Alliance Active" : "Free Member"}
            </div>
          </div>

          <div style={infoGrid}>
            <div style={infoItem}>
              <span style={labelStyle}>Email</span>
              <p style={valueStyle}>{email || "—"}</p>
            </div>

            <div style={infoItem}>
              <span style={labelStyle}>Artist Name</span>
              <p style={valueStyle}>{artistName || "—"}</p>
            </div>

            <div style={infoItem}>
              <span style={labelStyle}>Shop Name</span>
              <p style={valueStyle}>{shopName || "—"}</p>
            </div>

            <div style={infoItem}>
              <span style={labelStyle}>Membership</span>
              <p style={valueStyle}>{isAlliance ? "Alliance Member" : "Free"}</p>
            </div>

            <div style={infoItem}>
              <span style={labelStyle}>Profession</span>

              <select
                value={professionType}
                onChange={(e) => updateProfession(e.target.value)}
                style={selectStyle}
              >
                <option value="tattoo_artist">Tattoo Artist</option>
                <option value="piercer">Piercer</option>
                <option value="shop">Shop Owner / Manager</option>
              </select>
            </div>
          </div>
        </div>

        <div style={managementCard}>
          <div style={managementHeaderRow}>
            <div>
              <h2 style={sectionTitle}>My Open to Work Profile</h2>
              <p style={sectionSubtitle}>
                Free and Alliance members can post an Open to Work profile.
              </p>
            </div>
          </div>

          {openToWorkProfiles.length === 0 ? (
            <p style={emptyText}>You do not have an Open to Work profile yet.</p>
          ) : (
            <div style={listStack}>
              {openToWorkProfiles.map((item) => (
                <div key={item.id} style={listingCard}>
                  <div>
                    <p style={listingTitle}>
                      {getDisplayTitle(item, "Open to Work Profile")}
                    </p>

                    <p style={listingMeta}>
                      {getDisplaySubtitle(item)} · Status:{" "}
                      <strong>{item.status || "pending"}</strong>
                    </p>
                  </div>

                  <div style={listingButtonRow}>
                    <Link
                      href={`/artists/post?id=${item.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <button style={tinyButton}>Edit</button>
                    </Link>

                    <button
                      type="button"
                      onClick={() => hideOpenToWorkProfile(item.id)}
                      style={tinyButton}
                    >
                      Hide
                    </button>

                    <button
                      type="button"
                      onClick={() => renewOpenToWorkProfile(item.id)}
                      style={tinyButton}
                    >
                      Renew
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteOpenToWorkProfile(item.id)}
                      style={dangerTinyButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={managementCard}>
          <div style={managementHeaderRow}>
            <div>
              <h2 style={sectionTitle}>My Opportunities</h2>
              <p style={sectionSubtitle}>
                Alliance members can manage shop openings, guest spots,
                conventions, and other opportunities.
              </p>
            </div>
          </div>

          {myOpportunities.length === 0 ? (
            <p style={emptyText}>You do not have any opportunities posted yet.</p>
          ) : (
            <div style={listStack}>
              {myOpportunities.map((item) => (
                <div key={item.id} style={listingCard}>
                  <div>
                    <p style={listingTitle}>
                      {getDisplayTitle(item, "Opportunity")}
                    </p>

                    <p style={listingMeta}>
                      {getDisplaySubtitle(item)} · Status:{" "}
                      <strong>{item.status || "pending"}</strong>
                    </p>
                  </div>

                  <div style={listingButtonRow}>
                    <Link
                      href={`/opportunities/post?id=${item.id}`}
                      style={{ textDecoration: "none" }}
                    >
                      <button style={tinyButton}>Edit</button>
                    </Link>

                    <button
                      type="button"
                      onClick={() => hideOpportunity(item.id)}
                      style={tinyButton}
                    >
                      Hide
                    </button>

                    <button
                      type="button"
                      onClick={() => renewOpportunity(item.id)}
                      style={tinyButton}
                    >
                      Renew
                    </button>

                    <button
                      type="button"
                      onClick={() => deleteOpportunity(item.id)}
                      style={dangerTinyButton}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={benefitsCard}>
          <h2 style={sectionTitle}>Future Alliance Benefits</h2>

          <div style={benefitsGrid}>
            <div style={benefitItem}>
              <span style={benefitTitle}>Priority Member Benefits</span>
              <p style={benefitText}>
                Early access to new APA tools, partner programs, and
                member-only features.
              </p>
            </div>

            <div style={benefitItem}>
              <span style={benefitTitle}>Preferred Partner Discounts</span>
              <p style={benefitText}>
                Vendor and equipment discounts for Alliance members.
              </p>
            </div>

            <div style={benefitItem}>
              <span style={benefitTitle}>Voluntary Benefits</span>
              <p style={benefitText}>
                Insurance and protection options built for tattoo artists.
              </p>
            </div>

            <div style={benefitItem}>
              <span style={benefitTitle}>Professional Resources</span>
              <p style={benefitText}>
                Consent forms, aftercare templates, and business tools.
              </p>
            </div>
          </div>
        </div>

        <div style={buttonRow}>
          <Link href="/dashboard" style={{ textDecoration: "none" }}>
            <button style={secondaryButton}>Back to Dashboard</button>
          </Link>

          <button type="button" onClick={handleLogout} style={logoutButton}>
            Logout
          </button>
        </div>
      </div>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "white",
  padding: "60px 24px",
  display: "flex",
  justifyContent: "center",
};

const containerStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "1100px",
};

const logoStyle: React.CSSProperties = {
  width: "110px",
  marginBottom: "30px",
};

const headerBlock: React.CSSProperties = {
  marginBottom: "28px",
};

const titleStyle: React.CSSProperties = {
  fontSize: "42px",
  margin: 0,
  fontWeight: 700,
};

const subtitleStyle: React.CSSProperties = {
  color: "#9b9b9b",
  marginTop: "12px",
  fontSize: "16px",
};

const statusCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  padding: "28px",
  marginBottom: "28px",
};

const statusTopRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "28px",
  flexWrap: "wrap",
  gap: "14px",
};

const statusLabel: React.CSSProperties = {
  fontSize: "15px",
  color: "#9b9b9b",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const statusPill: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "999px",
  fontSize: "14px",
  fontWeight: 700,
};

const infoGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
  gap: "20px",
};

const infoItem: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "20px",
  padding: "24px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  color: "#8f8f8f",
  marginBottom: "10px",
  textTransform: "uppercase",
  letterSpacing: "1px",
};

const valueStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: 1.5,
  wordBreak: "break-word",
};

const managementCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  padding: "28px",
  marginBottom: "28px",
};

const managementHeaderRow: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: "18px",
  flexWrap: "wrap",
  marginBottom: "22px",
};

const sectionTitle: React.CSSProperties = {
  fontSize: "24px",
  margin: 0,
};

const sectionSubtitle: React.CSSProperties = {
  color: "#9b9b9b",
  marginTop: "10px",
  marginBottom: 0,
  lineHeight: 1.6,
};

const emptyText: React.CSSProperties = {
  color: "#9b9b9b",
  margin: 0,
  lineHeight: 1.6,
};

const listStack: React.CSSProperties = {
  display: "grid",
  gap: "14px",
};

const listingCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.035)",
  border: "1px solid rgba(255,255,255,0.07)",
  borderRadius: "18px",
  padding: "18px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "18px",
  flexWrap: "wrap",
};

const listingTitle: React.CSSProperties = {
  margin: 0,
  fontSize: "17px",
  fontWeight: 800,
};

const listingMeta: React.CSSProperties = {
  margin: "8px 0 0",
  color: "#a8a8a8",
  fontSize: "14px",
};

const listingButtonRow: React.CSSProperties = {
  display: "flex",
  gap: "8px",
  flexWrap: "wrap",
};

const primarySmallButton: React.CSSProperties = {
  background: "#ff5c00",
  color: "white",
  border: "none",
  padding: "12px 16px",
  borderRadius: "12px",
  cursor: "pointer",
  fontWeight: 800,
};

const tinyButton: React.CSSProperties = {
  background: "rgba(255,255,255,0.06)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.1)",
  padding: "10px 12px",
  borderRadius: "11px",
  cursor: "pointer",
  fontWeight: 700,
};

const dangerTinyButton: React.CSSProperties = {
  ...tinyButton,
  border: "1px solid rgba(255,80,80,0.35)",
  color: "#ff8a8a",
};

const messageBox: React.CSSProperties = {
  background: "rgba(255,92,0,0.12)",
  border: "1px solid rgba(255,92,0,0.35)",
  color: "#ffb088",
  borderRadius: "16px",
  padding: "14px 16px",
  marginBottom: "18px",
  fontWeight: 700,
};

const benefitsCard: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "24px",
  padding: "28px",
  marginBottom: "28px",
};

const benefitsGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
  gap: "18px",
  marginTop: "24px",
};

const benefitItem: React.CSSProperties = {
  background: "rgba(255,255,255,0.03)",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: "18px",
  padding: "20px",
};

const benefitTitle: React.CSSProperties = {
  display: "block",
  fontSize: "16px",
  fontWeight: 700,
  marginBottom: "12px",
};

const benefitText: React.CSSProperties = {
  color: "#b0b0b0",
  lineHeight: 1.7,
  fontSize: "14px",
  margin: 0,
};

const buttonRow: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  justifyContent: "center",
  alignItems: "center",
  flexWrap: "wrap",
  marginTop: "24px",
};

const secondaryButton: React.CSSProperties = {
  background: "rgba(255,255,255,0.05)",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  padding: "14px 22px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: 600,
};

const logoutButton: React.CSSProperties = {
  background: "#ff5c00",
  color: "white",
  border: "none",
  padding: "14px 22px",
  borderRadius: "14px",
  cursor: "pointer",
  fontWeight: 700,
};

const selectStyle: React.CSSProperties = {
  margin: 0,
  background: "#121212",
  color: "white",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "14px",
  padding: "12px 14px",
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: 1.5,
  outline: "none",
  width: "100%",
  minHeight: "52px",
  cursor: "pointer",
};
"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function PostOpportunityPage() {
  const [form, setForm] = useState({
    category: "Shop Hiring",
    title: "",
    shop_name: "",
    artist_name: "",
    city: "",
    state: "",
    location_type: "In Person",
    description: "",
    requirements: "",
    compensation: "",
    contact_email: "",
    contact_phone: "",
    website_url: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitOpportunity(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  alert("Please log in as an Alliance member before posting an opportunity.");
  setLoading(false);
  return;
}

    const { data: profile } = await supabase
  .from("artist_profiles")
  .select("compliance_status_visible")
  .eq("user_id", user.id)
  .maybeSingle();

    const { error } = await supabase.from("opportunities").insert({
  ...form,
  user_id: user.id,
  compliance_status_visible:
    profile?.compliance_status_visible ?? false,
  status: "pending",
  renewal_token: crypto.randomUUID(),
  expires_at: new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString(),
});

    setLoading(false);

    if (error) {
      alert(`Something went wrong: ${error.message}`);
      console.error("SUPABASE OPPORTUNITY ERROR:", error);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main style={pageStyle}>
        <div style={successCardStyle}>
          <p style={eyebrowStyle}>Artist Protection Alliance</p>
          <h1 style={titleStyle}>Opportunity Submitted</h1>
          <p style={subtitleStyle}>
            Your opportunity has been submitted for APA review. Once approved, it
            will appear in the Hub.
          </p>
          <a href="/opportunities" style={linkButtonStyle}>
            Back to Opportunity Hub
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <p style={eyebrowStyle}>Artist Protection Alliance</p>
          <h1 style={titleStyle}>Post an Opportunity</h1>
          <p style={subtitleStyle}>
            Submit a guest spot, studio opening,or convention for APA review.
          </p>
        </section>

        <form onSubmit={submitOpportunity} style={formStyle}>
          <label style={labelStyle}>
            Category
            <select
              value={form.category}
              onChange={(e) => updateField("category", e.target.value)}
              style={selectStyle}
            >
             <option>Shop Hiring</option>
             <option>Open Position</option>
             <option>Guest Spot</option>
             <option>Tattoo Convention</option>   
            </select>
          </label>

          <label style={labelStyle}>
            Listing Title
            <input
              required
              value={form.title}
              onChange={(e) => updateField("title", e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Studio / Shop Name
            <input
              value={form.shop_name}
              onChange={(e) => updateField("shop_name", e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Artist or Rep Name
            <input
              value={form.artist_name}
              onChange={(e) => updateField("artist_name", e.target.value)}
              style={inputStyle}
            />
          </label>

          <div style={twoColumnStyle}>
            <label style={labelStyle}>
              City
              <input
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={labelStyle}>
              State
              <input
                value={form.state}
                onChange={(e) => updateField("state", e.target.value)}
                style={inputStyle}
              />
            </label>
          </div>

          <label style={labelStyle}>
            Location Type
            <select
              value={form.location_type}
              onChange={(e) => updateField("location_type", e.target.value)}
              style={selectStyle}
            >
              <option>In Person</option>
              <option>Travel / Guest Spot</option>
              <option>Convention</option>
            </select>
          </label>

          <label style={labelStyle}>
            Opportunity Description
            <textarea
              required
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              style={textareaStyle}
            />
          </label>

          <label style={labelStyle}>
            Requirements
            <textarea
              value={form.requirements}
              onChange={(e) => updateField("requirements", e.target.value)}
              style={textareaStyle}
            />
          </label>

          <label style={labelStyle}>
            Compensation / Booth Terms / Agreement Details
            <input
              value={form.compensation}
              onChange={(e) => updateField("compensation", e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Contact Email
            <input
              required
              type="email"
              value={form.contact_email}
              onChange={(e) => updateField("contact_email", e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Contact Phone
            <input
              value={form.contact_phone}
              onChange={(e) => updateField("contact_phone", e.target.value)}
              style={inputStyle}
            />
          </label>

          <label style={labelStyle}>
            Website or Social Profile
            <input
              value={form.website_url}
              onChange={(e) => updateField("website_url", e.target.value)}
              style={inputStyle}
            />
          </label>

          <button type="submit" disabled={loading} style={submitButtonStyle}>
            {loading ? "Submitting Opportunity..." : "Submit Opportuninty"}
          </button>
        </form>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(255,92,0,0.18), transparent 32%), #000",
  color: "white",
  padding: "42px 20px 70px",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const containerStyle = {
  maxWidth: "880px",
  margin: "0 auto",
};

const heroStyle = {
  marginBottom: "26px",
  padding: "30px",
  borderRadius: "26px",
  border: "1px solid rgba(255,92,0,0.35)",
  background: "linear-gradient(135deg, rgba(26,26,26,0.96), rgba(8,8,8,0.98))",
  boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
};

const eyebrowStyle = {
  color: "#ff5c00",
  textTransform: "uppercase" as const,
  letterSpacing: "0.16em",
  fontSize: "12px",
  fontWeight: 900,
  margin: "0 0 12px",
};

const titleStyle = {
  color: "#ff5c00",
  fontSize: "clamp(40px, 6vw, 58px)",
  lineHeight: "1",
  margin: 0,
  letterSpacing: "-0.045em",
};

const subtitleStyle = {
  color: "#d8d8d8",
  fontSize: "17px",
  lineHeight: "1.6",
  margin: "16px 0 0",
};

const formStyle = {
  display: "grid",
  gap: "18px",
  padding: "28px",
  borderRadius: "26px",
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(18,18,18,0.94)",
  boxShadow: "0 18px 60px rgba(0,0,0,0.45)",
};

const labelStyle = {
  display: "grid",
  gap: "8px",
  color: "#ff5c00",
  fontWeight: 900,
  fontSize: "15px",
};

const twoColumnStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const inputStyle = {
  width: "100%",
  padding: "15px 16px",
  borderRadius: "14px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "#101010",
  color: "white",
  outline: "none",
  boxSizing: "border-box" as const,
  fontSize: "14px",
};

const selectStyle = {
  ...inputStyle,
  appearance: "none" as const,
  WebkitAppearance: "none" as const,
  MozAppearance: "none" as const,
  background:
    "linear-gradient(135deg, #101010, #151515)",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "130px",
  resize: "vertical" as const,
};

const submitButtonStyle = {
  marginTop: "8px",
  background: "linear-gradient(135deg, #ff7a2f, #ff5c00)",
  color: "#111",
  padding: "17px",
  borderRadius: "16px",
  border: "none",
  fontWeight: 950,
  fontSize: "16px",
  cursor: "pointer",
  boxShadow: "0 14px 34px rgba(255,92,0,0.32)",
};

const successCardStyle = {
  maxWidth: "760px",
  margin: "0 auto",
  padding: "34px",
  borderRadius: "26px",
  border: "1px solid rgba(255,92,0,0.35)",
  background: "linear-gradient(135deg, rgba(26,26,26,0.96), rgba(8,8,8,0.98))",
  boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
};

const linkButtonStyle = {
  display: "inline-block",
  marginTop: "24px",
  background: "linear-gradient(135deg, #ff7a2f, #ff5c00)",
  color: "#111",
  padding: "14px 18px",
  borderRadius: "999px",
  fontWeight: 900,
  textDecoration: "none",
};
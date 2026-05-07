"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

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

const { error } = await supabase.from("opportunities").insert({
  ...form,
  status: "pending",
  renewal_token: crypto.randomUUID(),
  expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
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
      <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", background: "#1a1a1a", padding: "30px", borderRadius: "18px" }}>
          <h1>Opportunity submitted!</h1>
          <p style={{ color: "#cfcfcf" }}>
            Your listing has been submitted for APA review. Once approved, it will appear in the Opportunity Hub.
          </p>
          <a href="/opportunities" style={{ color: "#d4af37", fontWeight: "bold" }}>
            Back to Opportunity Hub
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "38px", marginBottom: "10px" }}>
          Post an Opportunity
        </h1>

        <p style={{ color: "#cfcfcf", marginBottom: "30px" }}>
          Submit a tattoo industry opportunity for APA review.
        </p>

        <form onSubmit={submitOpportunity} style={{ display: "grid", gap: "16px" }}>
          <label>
            Category
            <select value={form.category} onChange={(e) => updateField("category", e.target.value)} style={inputStyle}>
              <option>Shop Hiring</option>
              <option>Open Position</option>
              <option>Guest Spot</option>
              <option>Tattoo Convention</option>
              <option>Artist Open to Work</option>
            </select>
          </label>

          <label>
            Title
            <input required value={form.title} onChange={(e) => updateField("title", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Shop Name
            <input value={form.shop_name} onChange={(e) => updateField("shop_name", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Artist Name
            <input value={form.artist_name} onChange={(e) => updateField("artist_name", e.target.value)} style={inputStyle} />
          </label>

          <label>
            City
            <input value={form.city} onChange={(e) => updateField("city", e.target.value)} style={inputStyle} />
          </label>

          <label>
            State
            <input value={form.state} onChange={(e) => updateField("state", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Location Type
            <select value={form.location_type} onChange={(e) => updateField("location_type", e.target.value)} style={inputStyle}>
              <option>In Person</option>
              <option>Travel</option>
              <option>Convention</option>
            </select>
          </label>

          <label>
            Description
            <textarea required value={form.description} onChange={(e) => updateField("description", e.target.value)} style={textareaStyle} />
          </label>

          <label>
            Requirements
            <textarea value={form.requirements} onChange={(e) => updateField("requirements", e.target.value)} style={textareaStyle} />
          </label>

          <label>
            Compensation / Booth Rent / Deal Terms
            <input value={form.compensation} onChange={(e) => updateField("compensation", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Contact Email
            <input required type="email" value={form.contact_email} onChange={(e) => updateField("contact_email", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Contact Phone
            <input value={form.contact_phone} onChange={(e) => updateField("contact_phone", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Website / Instagram Link
            <input value={form.website_url} onChange={(e) => updateField("website_url", e.target.value)} style={inputStyle} />
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              background: "#d4af37",
              color: "#111",
              padding: "16px",
              borderRadius: "12px",
              border: "none",
              fontWeight: "bold",
              fontSize: "16px",
              cursor: "pointer",
            }}
          >
            {loading ? "Submitting..." : "Submit Opportunity"}
          </button>
        </form>
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#1a1a1a",
  color: "white",
  marginTop: "6px",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "120px",
};
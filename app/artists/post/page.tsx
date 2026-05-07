"use client";

import { useState } from "react";
import { supabase } from "../../../lib/supabase";

export default function PostArtistProfilePage() {
  const [form, setForm] = useState({
    artist_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    tattoo_styles: "",
    years_experience: "",
    looking_for: "Shop Position",
    willing_to_travel: "Local only",
    instagram_url: "",
    portfolio_url: "",
    bio: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.from("artist_profiles").insert({
      ...form,
      status: "pending",
    });

    setLoading(false);

    if (error) {
      alert("Profile submission failed: " + error.message);
      console.error(error);
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
        <div style={{ maxWidth: "700px", margin: "0 auto", background: "#1a1a1a", padding: "30px", borderRadius: "18px" }}>
          <h1>Profile submitted!</h1>
          <p style={{ color: "#cfcfcf" }}>
            Your Open to Work profile has been submitted for APA review. Once approved, it will appear in the artist directory.
          </p>
          <a href="/artists" style={{ color: "#d4af37", fontWeight: "bold" }}>
            Back to Artists
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "38px", marginBottom: "10px" }}>
          Create Open to Work Profile
        </h1>

        <p style={{ color: "#cfcfcf", marginBottom: "30px" }}>
          Let shops discover you for positions, guest spots, conventions, and travel opportunities.
        </p>

        <form onSubmit={submitProfile} style={{ display: "grid", gap: "16px" }}>
          <label>
            Artist Name
            <input required value={form.artist_name} onChange={(e) => updateField("artist_name", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Contact Email
            <input required type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Phone
            <input value={form.phone} onChange={(e) => updateField("phone", e.target.value)} style={inputStyle} />
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
            Tattoo Styles
            <input
              placeholder="Black & grey, realism, traditional, fine line..."
              value={form.tattoo_styles}
              onChange={(e) => updateField("tattoo_styles", e.target.value)}
              style={inputStyle}
            />
          </label>

          <label>
            Years Experience
            <input
              placeholder="Example: 3 years"
              value={form.years_experience}
              onChange={(e) => updateField("years_experience", e.target.value)}
              style={inputStyle}
            />
          </label>

          <label>
            Looking For
            <select value={form.looking_for} onChange={(e) => updateField("looking_for", e.target.value)} style={inputStyle}>
              <option>Shop Position</option>
              <option>Guest Spots</option>
              <option>Convention Opportunities</option>
              <option>Apprenticeship</option>
              <option>Open to Multiple Opportunities</option>
            </select>
          </label>

          <label>
            Willing to Travel
            <select value={form.willing_to_travel} onChange={(e) => updateField("willing_to_travel", e.target.value)} style={inputStyle}>
              <option>Local only</option>
              <option>Within my state</option>
              <option>Regional travel</option>
              <option>Nationwide travel</option>
            </select>
          </label>

          <label>
            Instagram URL
            <input value={form.instagram_url} onChange={(e) => updateField("instagram_url", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Portfolio URL
            <input value={form.portfolio_url} onChange={(e) => updateField("portfolio_url", e.target.value)} style={inputStyle} />
          </label>

          <label>
            Short Bio
            <textarea
              required
              placeholder="Tell shops what you specialize in, what you're looking for, and why they should reach out."
              value={form.bio}
              onChange={(e) => updateField("bio", e.target.value)}
              style={textareaStyle}
            />
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
            {loading ? "Submitting..." : "Submit Profile"}
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
  minHeight: "140px",
};
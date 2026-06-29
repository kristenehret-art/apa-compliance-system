"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();

export default function PostArtistProfilePage() {
  const searchParams = useSearchParams();
const editId = searchParams.get("id");
const isEditMode = Boolean(editId);
const router = useRouter();
const [authChecking, setAuthChecking] = useState(true);

  const [form, setForm] = useState({
    artist_name: "",
    email: "",
    phone: "",
    city: "",
    state: "",
    tattoo_styles: "",
    years_experience: "",
    looking_for: "Tattoo Artist Position",
    willing_to_travel: "Local only",
    instagram_url: "",
    portfolio_url: "",
    bio: "",
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  
  function normalizeInstagram(value: string) {
  const cleaned = value.trim();

  if (!cleaned) return "";

  if (cleaned.startsWith("http://") || cleaned.startsWith("https://")) {
    return cleaned;
  }

  const handle = cleaned.replace("@", "");

  return `https://instagram.com/${handle}`;
}

  function updateField(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  useEffect(() => {
  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
      return;
    }

    setAuthChecking(false);
  }

  checkAuth();
}, [router]);

  useEffect(() => {
  async function loadArtistProfileForEdit() {
    if (!editId) return;

    setLoading(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      alert("Please log in to edit this Open to Work profile.");
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("artist_profiles")
      .select("*")
      .eq("id", editId)
      .eq("user_id", user.id)
      .maybeSingle();

    setLoading(false);

    if (error) {
      alert(`Could not load Open to Work profile: ${error.message}`);
      console.error("LOAD OPEN TO WORK ERROR:", error);
      return;
    }

    if (!data) {
      alert("This Open to Work profile could not be found or does not belong to your account.");
      return;
    }

    setForm({
      artist_name: data.artist_name || "",
      email: data.email || "",
      phone: data.phone || "",
      city: data.city || "",
      state: data.state || "",
      tattoo_styles: data.tattoo_styles || "",
      years_experience: data.years_experience
        ? String(data.years_experience)
        : "",
      looking_for: data.looking_for || "Tattoo Artist Position",
      willing_to_travel: data.willing_to_travel || "Local only",
      instagram_url: data.instagram_url || "",
      portfolio_url: data.portfolio_url || "",
      bio: data.bio || "",
    });
  }

  loadArtistProfileForEdit();
}, [editId]);

  async function submitProfile(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
const {
  data: { user },
} = await supabase.auth.getUser();

if (!user) {
  alert("Please log in before posting an Open to Work profile.");
  setLoading(false);
  return;
}

  const { data: existingProfile } = await supabase
  .from("artist_profiles")
  .select("compliance_status_visible")
  .eq("user_id", user.id)
  .maybeSingle();

const { data, error } = isEditMode
  ? await supabase
      .from("artist_profiles")
      .update({
        ...form,
        instagram_url: normalizeInstagram(form.instagram_url),
        status: "pending",
      })
      .eq("id", editId)
      .eq("user_id", user.id)
      .select()
  : await supabase
      .from("artist_profiles")
      .insert({
        ...form,
        instagram_url: normalizeInstagram(form.instagram_url),
        user_id: user.id,
        compliance_status_visible:
          existingProfile?.compliance_status_visible ?? false,
        status: "pending",
      })
      .select();

if (!data || data.length === 0) {
  setLoading(false);
  alert(
    "This Open to Work profile could not be saved. It may not belong to your account."
  );
  return;
}

    setSubmitted(true);
  }

  if (authChecking) {
  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <p>Checking login...</p>
      </div>
    </main>
  );
}

  if (submitted) {
    return (
      <main style={pageStyle}>
        <div style={successCardStyle}>
          <h1
            style={{
              fontSize: "32px",
              marginBottom: "12px",
              color: "#ff5c00",
            }}
          >
            {isEditMode ? "Profile Updated" : "Profile Submitted"}
          </h1>

          <p style={{ color: "#cfcfcf", lineHeight: 1.6 }}>
            {isEditMode
  ? "Your Open to Work profile has been updated and sent back for APA review. It will not appear publicly again until an admin approves the changes."
  : "Your Open to Work profile has been submitted for APA review. Once approved, it will appear in the artist directory within 24 hours."}
        
          </p>

          <a
            href="/artists"
            style={{
              color: "#ff5c00",
              fontWeight: "bold",
              marginTop: "20px",
              display: "inline-block",
            }}
          >
            Back to Artists
          </a>
        </div>
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerCardStyle}>
          <h1 style={titleStyle}>{isEditMode ? "Edit Open to Work Profile" : "Create Open to Work Profile"}</h1>

          <p style={subtitleStyle}>
            Let shops discover you for positions, guest spots,
            conventions, and travel opportunities.
          </p>
        </div>

        <form onSubmit={submitProfile} style={formStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Artist Name</label>
            <input
              required
              value={form.artist_name}
              onChange={(e) =>
                updateField("artist_name", e.target.value)
              }
              style={inputStyle}
            />
          </div>

          <div style={twoColumnGrid}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Contact Email</label>
              <input
                required
                type="email"
                value={form.email}
                onChange={(e) =>
                  updateField("email", e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Phone</label>
              <input
                value={form.phone}
                onChange={(e) =>
                  updateField("phone", e.target.value)
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div style={twoColumnGrid}>
            <div style={fieldStyle}>
              <label style={labelStyle}>City</label>
              <input
                value={form.city}
                onChange={(e) =>
                  updateField("city", e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>State</label>
              <input
                value={form.state}
                onChange={(e) =>
                  updateField("state", e.target.value)
                }
                style={inputStyle}
              />
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Tattoo Styles</label>

            <input
              placeholder="Black & grey, realism, traditional, fine line..."
              value={form.tattoo_styles}
              onChange={(e) =>
                updateField("tattoo_styles", e.target.value)
              }
              style={inputStyle}
            />
          </div>

          <div style={twoColumnGrid}>
            <div style={fieldStyle}>
              <label style={labelStyle}>Years Experience</label>

              <input
                placeholder="Example: 3 years"
                value={form.years_experience}
                onChange={(e) =>
                  updateField("years_experience", e.target.value)
                }
                style={inputStyle}
              />
            </div>

            <div style={fieldStyle}>
              <label style={labelStyle}>Looking For</label>

              <select
                value={form.looking_for}
                onChange={(e) =>
                  updateField("looking_for", e.target.value)
                }
                style={selectStyle}
              >
<option>Tattoo Artist Position</option>
<option>Piercer Position</option>
<option>Shop Manager</option>
<option>Shop Hand / Front Desk</option>
<option>Apprenticeship</option>
<option>Guest Spots</option>
<option>Convention Opportunities</option>
<option>Travel / Guest Artist</option>
<option>Open to Multiple Opportunities</option>
              </select>
            </div>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Willing to Travel</label>

            <select
              value={form.willing_to_travel}
              onChange={(e) =>
                updateField("willing_to_travel", e.target.value)
              }
              style={selectStyle}
            >
              <option>Local only</option>
              <option>Within my state</option>
              <option>Regional travel</option>
              <option>Nationwide travel</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Instagram Handle or URL</label>

            <input
              value={form.instagram_url}
              onChange={(e) =>
                updateField("instagram_url", e.target.value)
              }
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Portfolio URL</label>

            <input
              value={form.portfolio_url}
              onChange={(e) =>
                updateField("portfolio_url", e.target.value)
              }
              style={inputStyle}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Short Bio</label>

            <textarea
              required
              placeholder="Tell shops what you specialize in, what you're looking for, and why they should reach out."
              value={form.bio}
              onChange={(e) =>
                updateField("bio", e.target.value)
              }
              style={textareaStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={submitButtonStyle}
          >
            {loading
  ? isEditMode
    ? "Updating..."
    : "Submitting..."
  : isEditMode
  ? "Update Profile"
  : "Submit Profile"}
          </button>
        </form>
      </div>
    </main>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background: "#0f0f0f",
  color: "white",
  padding: "60px 20px",
};

const containerStyle = {
  width: "100%",
  maxWidth: "860px",
  margin: "0 auto",
};

const headerCardStyle = {
  marginBottom: "32px",
};

const titleStyle = {
  fontSize: "42px",
  fontWeight: 700,
  marginBottom: "12px",
  color: "#ff5c00",
};

const subtitleStyle = {
  color: "#b0b0b0",
  fontSize: "16px",
  lineHeight: 1.6,
};

const formStyle = {
  background: "#161616",
  border: "1px solid #242424",
  borderRadius: "22px",
  padding: "32px",
  display: "flex",
  flexDirection: "column" as const,
  gap: "22px",
};

const fieldStyle = {
  display: "flex",
  flexDirection: "column" as const,
  gap: "8px",
};

const labelStyle = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#ff5c00",
};

const twoColumnGrid = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "18px",
};

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "12px",
  border: "1px solid #333",
  background: "#111",
  color: "white",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box" as const,
};

const selectStyle = {
  ...inputStyle,
  height: "52px",
  cursor: "pointer",
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "150px",
  resize: "vertical" as const,
};

const submitButtonStyle = {
  background: "#ff5c00",
  color: "#111",
  padding: "16px",
  borderRadius: "14px",
  border: "none",
  fontWeight: "bold",
  fontSize: "16px",
  cursor: "pointer",
  marginTop: "10px",
};

const successCardStyle = {
  maxWidth: "700px",
  margin: "0 auto",
  background: "linear-gradient(135deg, rgba(26,26,26,0.98), rgba(8,8,8,0.98))",
  border: "1px solid rgba(255,92,0,0.45)",
  padding: "40px",
  borderRadius: "24px",
  boxShadow: "0 24px 80px rgba(0,0,0,0.55)",
};
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AllianceGate from "../../components/AllianceGate";

const supabase = createClient();

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [stateFilter, setStateFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [activeApplyId, setActiveApplyId] = useState<string | null>(null);
  const [applying, setApplying] = useState(false);

  const [applicationForm, setApplicationForm] = useState({
    applicantName: "",
    applicantEmail: "",
    applicantPhone: "",
    applicantInstagram: "",
    applicantPortfolio: "",
    message: "",
  });

  const [isAllianceMember, setIsAllianceMember] = useState(false);

  useEffect(() => {
    fetchOpportunities();
    loadMembership();
  }, []);

  async function loadMembership() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setIsAllianceMember(false);
      return;
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("membership_tier")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Membership load error:", error);
      setIsAllianceMember(false);
      return;
    }

    const tier = profile?.membership_tier;
    setIsAllianceMember(tier === "alliance" || tier === "admin");
  }

  async function fetchOpportunities() {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("status", "approved")
      .gt("expires_at", now)
      .order("is_featured", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading opportunities:", error);
    }

    setOpportunities(data || []);
    setLoading(false);
  }

  function updateApplicationField(field: string, value: string) {
    setApplicationForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitApplication(e: React.FormEvent, item: any) {
    e.preventDefault();
    setApplying(true);

    const isConvention = item.category === "Tattoo Convention";
  
    const response = await fetch("/api/apply-opportunity", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        opportunityId: item.id,
        opportunityTitle: item.title,
        shopEmail: item.contact_email,
        ...applicationForm,
      }),
    });

    const result = await response.json();
    setApplying(false);

    if (!response.ok) {
      alert(result.error || "Submission failed.");
      return;
    }

    alert(
      isConvention
        ? "Inquiry submitted successfully."
        : "Application submitted successfully."
    );

    setActiveApplyId(null);
    setApplicationForm({
      applicantName: "",
      applicantEmail: "",
      applicantPhone: "",
      applicantInstagram: "",
      applicantPortfolio: "",
      message: "",
    });
  }

  const states = useMemo(() => {
    const uniqueStates = opportunities.map((item) => item.state).filter(Boolean);
    return ["All", ...Array.from(new Set(uniqueStates)).sort()];
  }, [opportunities]);

  const featuredOpportunities = opportunities.filter((item) => item.is_featured);

  const filteredOpportunities = opportunities.filter((item) => {
    const matchesCategory =
      categoryFilter === "All" || item.category === categoryFilter;

    const matchesState = stateFilter === "All" || item.state === stateFilter;

    const search = searchTerm.toLowerCase();

    const matchesSearch =
      !search ||
      item.title?.toLowerCase().includes(search) ||
      item.shop_name?.toLowerCase().includes(search) ||
      item.artist_name?.toLowerCase().includes(search) ||
      item.city?.toLowerCase().includes(search) ||
      item.state?.toLowerCase().includes(search) ||
      item.category?.toLowerCase().includes(search) ||
      item.description?.toLowerCase().includes(search);

    return matchesCategory && matchesState && matchesSearch;
  });

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <div>
            <p style={eyebrowStyle}>Artist Protection Alliance</p>
            <h1 style={titleStyle}>Opportunity Hub</h1>
            <p style={subtitleStyle}>
              Guest spots, shop openings, conventions, and professional
              opportunities — built for tattoo artists, piercers, and shops.
            </p>
          </div>

          <AllianceGate
            allowed={isAllianceMember}
            title="Alliance Posting Tools"
            description="Alliance members can post jobs, guest spots, conventions, and industry opportunities."
          >
            <a href="/opportunities/post" style={postButtonStyle}>
              Post an Opportunity
            </a>
          </AllianceGate>
        </section>

        <section style={statsRowStyle}>
          <div style={statCardStyle}>
            <strong style={statNumberStyle}>{opportunities.length}</strong>
            <span style={statLabelStyle}>Active Listings</span>
          </div>

          <div style={statCardStyle}>
            <strong style={statNumberStyle}>
              {featuredOpportunities.length}
            </strong>
            <span style={statLabelStyle}>Featured Listings</span>
          </div>

          <div style={statCardStyle}>
            <strong style={statNumberStyle}>30</strong>
            <span style={statLabelStyle}>Day Auto-Expire</span>
          </div>
        </section>

        <section style={filterPanelStyle}>
          <div>
            <p style={sectionEyebrowStyle}>BROWSE OPPORTUNITIES</p>
            <h2 style={panelTitleStyle}>Find the right opportunity</h2>
            <p style={panelSubtitleStyle}>
              Search by shop, artist, city, category, or keyword.
            </p>
          </div>

          <input
            placeholder="Search by shop, city, artist, keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
          />

          <div style={filterGridStyle}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={inputStyle}
            >
              <option>All</option>
              <option>Shop Hiring</option>
              <option>Open Position</option>
              <option>Guest Spot</option>
              <option>Tattoo Convention</option>
            </select>

            <select
              value={stateFilter}
              onChange={(e) => setStateFilter(e.target.value)}
              style={inputStyle}
            >
              {states.map((state) => (
                <option key={state}>{state}</option>
              ))}
            </select>
          </div>

          <p style={resultCountStyle}>
            Showing {filteredOpportunities.length} of {opportunities.length}{" "}
            active listings.
          </p>
        </section>

        {featuredOpportunities.length > 0 && (
          <section style={sectionStyle}>
            <div style={sectionHeaderStyle}>
              <h2 style={sectionTitleStyle}>Featured Opportunities</h2>
              <p style={sectionSubTextStyle}>
                Highlighted listings from studios, artists, and industry
                professionals.
              </p>
            </div>

            <div style={featuredGridStyle}>
              {featuredOpportunities.slice(0, 3).map((item) => (
                <OpportunityCard
                  key={item.id}
                  item={item}
                  activeApplyId={activeApplyId}
                  setActiveApplyId={setActiveApplyId}
                  submitApplication={submitApplication}
                  applying={applying}
                  applicationForm={applicationForm}
                  updateApplicationField={updateApplicationField}
                  featured={true}
                />
              ))}
            </div>
          </section>
        )}

        <section style={sectionStyle}>
          <div style={sectionHeaderStyle}>
            <h2 style={sectionTitleStyle}>All Opportunities</h2>
            <p style={sectionSubTextStyle}>
              Listings automatically expire to keep opportunities current and
              active.
            </p>
          </div>

          {loading ? (
            <div style={emptyStateStyle}>
              <h2>Loading opportunities...</h2>
              <p style={mutedTextStyle}>
                Loading current opportunities and featured listings.
              </p>
            </div>
          ) : filteredOpportunities.length === 0 ? (
            <div style={emptyStateStyle}>
              <h2>No opportunities matched your search.</h2>
              <p style={mutedTextStyle}>
                Try adjusting your filters or check back for new listings soon.
              </p>
            </div>
          ) : (
            <div style={listingGridStyle}>
              {filteredOpportunities.map((item) => (
                <OpportunityCard
                  key={item.id}
                  item={item}
                  activeApplyId={activeApplyId}
                  setActiveApplyId={setActiveApplyId}
                  submitApplication={submitApplication}
                  applying={applying}
                  applicationForm={applicationForm}
                  updateApplicationField={updateApplicationField}
                  featured={item.is_featured}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function OpportunityCard({
  item,
  activeApplyId,
  setActiveApplyId,
  submitApplication,
  applying,
  applicationForm,
  updateApplicationField,
  featured,
}: any) {
  const isOpenToWork = item.category === "Artist Open to Work";
  const isConvention = item.category === "Tattoo Convention";
  const showComplianceBadge = item.compliance_status_visible === true;
  function getSafeWebsiteUrl(value: string) {
    if (!value) return "";

    const trimmed = value.trim();

    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      return trimmed;
    }

    if (trimmed.startsWith("@")) {
      return `https://instagram.com/${trimmed.replace("@", "")}`;
    }

    if (!trimmed.includes(".") && !trimmed.includes("/")) {
      return `https://instagram.com/${trimmed}`;
    }

    return `https://${trimmed}`;
  }

  const actionText = isConvention ? "Inquire" : "Apply";
  const closeText = isConvention ? "Close Inquiry" : "Close Application";
  const formTitle = isConvention ? "Submit Inquiry" : "Submit Application";
  const submitText = isConvention ? "Submit Inquiry" : "Submit Application";

  const messagePlaceholder = isConvention
    ? "Introduce yourself and explain what you would like to inquire about."
    : "Introduce yourself and explain why you're interested in this opportunity.";

  return (
    <article style={featured ? featuredCardStyle : cardStyle}>
      <div style={cardTopRowStyle}>
        <span style={categoryPillStyle}>{item.category}</span>
        {featured && <span style={featuredPillStyle}>Featured</span>}
      </div>

      <h2 style={cardTitleStyle}>{item.title}</h2>

      <p style={locationStyle}>
        {item.shop_name || item.artist_name || "Professional Opportunity"} ·{" "}
        {item.city || "Location TBD"}
        {item.state ? `, ${item.state}` : ""}
      </p>

      <p style={descriptionStyle}>{item.description}</p>

{showComplianceBadge && (
  <Link
  href={`/compliance/public/${item.id}?from=opportunities`}
    style={{
      textDecoration: "none",
      width: "fit-content",
    }}
  >
    <div style={complianceBadgeStyle}>
      Compliance Status Shared Through APA →
    </div>
  </Link>
)}
      
      {item.requirements && (
        <p style={detailTextStyle}>
          <strong>Requirements:</strong> {item.requirements}
        </p>
      )}

      {item.compensation && (
        <p style={detailTextStyle}>
          <strong>Compensation:</strong> {item.compensation}
        </p>
      )}

      {item.website_url && (
        <p style={{ marginTop: "14px", marginBottom: 0 }}>
          <a
            href={getSafeWebsiteUrl(item.website_url)}
            target="_blank"
            rel="noreferrer"
            style={brandLinkStyle}
          >
            View Website or Social Profile
          </a>
        </p>
      )}

      <div style={buttonRowStyle}>
        {isOpenToWork ? (
          item.website_url ? (
            <a
              href={getSafeWebsiteUrl(item.website_url)}
              target="_blank"
              rel="noreferrer"
              style={{
                ...applyButtonStyle,
                display: "inline-flex",
                textDecoration: "none",
              }}
            >
              Contact Artist
            </a>
          ) : null
        ) : (
          <button
            onClick={() =>
              setActiveApplyId(activeApplyId === item.id ? null : item.id)
            }
            style={applyButtonStyle}
          >
            {activeApplyId === item.id ? closeText : actionText}
          </button>
        )}
      </div>

      {!isOpenToWork && activeApplyId === item.id && (
        <form onSubmit={(e) => submitApplication(e, item)} style={formStyle}>
          <h3 style={formTitleStyle}>{formTitle}</h3>

          <input
            required
            placeholder="Your name"
            value={applicationForm.applicantName}
            onChange={(e) =>
              updateApplicationField("applicantName", e.target.value)
            }
            style={inputStyle}
          />

          <input
            required
            type="email"
            placeholder="Your email"
            value={applicationForm.applicantEmail}
            onChange={(e) =>
              updateApplicationField("applicantEmail", e.target.value)
            }
            style={inputStyle}
          />

          <input
            placeholder="Phone"
            value={applicationForm.applicantPhone}
            onChange={(e) =>
              updateApplicationField("applicantPhone", e.target.value)
            }
            style={inputStyle}
          />

          <input
            placeholder="Instagram link"
            value={applicationForm.applicantInstagram}
            onChange={(e) =>
              updateApplicationField("applicantInstagram", e.target.value)
            }
            style={inputStyle}
          />

          <input
            placeholder="Portfolio link"
            value={applicationForm.applicantPortfolio}
            onChange={(e) =>
              updateApplicationField("applicantPortfolio", e.target.value)
            }
            style={inputStyle}
          />

          <textarea
            required
            placeholder={messagePlaceholder}
            value={applicationForm.message}
            onChange={(e) => updateApplicationField("message", e.target.value)}
            style={textareaStyle}
          />

          <button type="submit" disabled={applying} style={submitButtonStyle}>
            {applying ? "Submitting..." : submitText}
          </button>
        </form>
      )}
    </article>
  );
}

const pageStyle = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(255,92,0,0.18), transparent 30%), linear-gradient(180deg, #0b0502 0%, #050505 38%, #050505 100%)",
  color: "white",
  padding: "48px 24px 80px",
  fontFamily:
    "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
};

const containerStyle = {
  maxWidth: "1180px",
  margin: "0 auto",
};

const heroStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "24px",
  padding: "42px",
  borderRadius: "30px",
  border: "1px solid rgba(255,92,0,0.42)",
  background:
    "linear-gradient(135deg, rgba(22,22,22,0.98), rgba(8,8,8,0.98))",
  boxShadow: "0 24px 80px rgba(0,0,0,0.6), 0 0 42px rgba(255,92,0,0.12)",
  marginBottom: "24px",
  flexWrap: "wrap" as const,
};

const eyebrowStyle = {
  color: "#ff5c00",
  textTransform: "uppercase" as const,
  letterSpacing: "0.16em",
  fontSize: "12px",
  fontWeight: 800,
  marginBottom: "12px",
};

const titleStyle = {
  fontSize: "clamp(44px, 6vw, 72px)",
  lineHeight: "0.95",
  margin: 0,
  letterSpacing: "-0.055em",
};

const subtitleStyle = {
  color: "#d7d7d7",
  fontSize: "18px",
  lineHeight: "1.6",
  marginTop: "18px",
  maxWidth: "710px",
};

const postButtonStyle = {
  display: "inline-block",
  background: "linear-gradient(135deg, #ff7a2f, #ff5c00)",
  color: "#111",
  padding: "15px 22px",
  borderRadius: "999px",
  fontWeight: 900,
  textDecoration: "none",
  boxShadow: "0 12px 30px rgba(255,92,0,0.35)",
};

const statsRowStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))",
  gap: "14px",
  marginBottom: "24px",
};

const statCardStyle = {
  background: "rgba(26,26,26,0.82)",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "20px",
  padding: "18px",
};

const statNumberStyle = {
  display: "block",
  fontSize: "30px",
  color: "#ff5c00",
};

const statLabelStyle = {
  color: "#a8a8a8",
  fontSize: "14px",
};

const filterPanelStyle = {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.98), rgba(12,12,12,0.98))",
  padding: "34px",
  borderRadius: "28px",
  border: "1px solid rgba(255,255,255,0.1)",
  marginBottom: "42px",
  display: "grid",
  gap: "22px",
  boxShadow: "0 18px 45px rgba(0,0,0,0.42)",
};

const sectionEyebrowStyle = {
  color: "#ff5c00",
  fontSize: "12px",
  fontWeight: 800,
  letterSpacing: "2px",
  margin: "0 0 8px",
};

const panelTitleStyle = {
  margin: 0,
  fontSize: "38px",
  lineHeight: 1.05,
  fontWeight: 900,
};

const panelSubtitleStyle = {
  color: "#b8b8b8",
  margin: "10px 0 0",
  fontSize: "15px",
};

const filterGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px",
  width: "100%",
};

const inputStyle = {
  width: "100%",
  height: "54px",
  padding: "0 18px",
  borderRadius: "16px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "#0d0d0d",
  color: "white",
  outline: "none",
  boxSizing: "border-box" as const,
  fontSize: "15px",
  appearance: "none" as const,
};

const textareaStyle = {
  ...inputStyle,
  minHeight: "120px",
  resize: "vertical" as const,
};

const resultCountStyle = {
  color: "#a7a7a7",
  margin: 0,
  fontSize: "15px",
};

const sectionStyle = {
  marginBottom: "38px",
};

const sectionHeaderStyle = {
  marginBottom: "16px",
};

const sectionTitleStyle = {
  margin: 0,
  fontSize: "28px",
};

const sectionSubTextStyle = {
  color: "#9f9f9f",
  margin: "6px 0 0",
};

const featuredGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(290px, 1fr))",
  gap: "18px",
};

const listingGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(310px, 1fr))",
  gap: "18px",
};

const cardStyle = {
  background:
    "linear-gradient(180deg, rgba(24,24,24,0.98), rgba(12,12,12,0.98))",
  padding: "24px",
  borderRadius: "24px",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 18px 50px rgba(0,0,0,0.34)",
  display: "flex",
  flexDirection: "column" as const,
  minHeight: "320px",
};

const featuredCardStyle = {
  ...cardStyle,
  background:
    "linear-gradient(180deg, rgba(40,20,10,0.98), rgba(16,16,16,0.98))",
  border: "1px solid rgba(255,92,0,0.55)",
  boxShadow: "0 0 34px rgba(255,92,0,0.18)",
};

const cardTopRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "10px",
  marginBottom: "14px",
};

const categoryPillStyle = {
  color: "#ff5c00",
  background: "rgba(255,92,0,0.12)",
  border: "1px solid rgba(255,92,0,0.35)",
  padding: "7px 11px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 900,
};

const featuredPillStyle = {
  background: "#ff5c00",
  color: "#111",
  padding: "7px 11px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 900,
};

const complianceBadgeStyle = {
  marginTop: "14px",
  display: "inline-flex",
  alignItems: "center",
  width: "fit-content",
  background: "rgba(34,197,94,0.12)",
  border: "1px solid rgba(34,197,94,0.35)",
  color: "#4ade80",
  padding: "8px 12px",
  borderRadius: "999px",
  fontSize: "12px",
  fontWeight: 800,
};

const cardTitleStyle = {
  fontSize: "25px",
  lineHeight: "1.15",
  margin: "0 0 10px",
};

const locationStyle = {
  color: "#cfcfcf",
  margin: 0,
};

const descriptionStyle = {
  marginTop: "16px",
  lineHeight: "1.65",
  color: "#ededed",
};

const detailTextStyle = {
  marginTop: "12px",
  color: "#cfcfcf",
  lineHeight: "1.55",
};

const brandLinkStyle = {
  color: "#ff5c00",
  fontWeight: "bold",
  textDecoration: "none",
};

const buttonRowStyle = {
  marginTop: "auto",
  paddingTop: "26px",
  display: "flex",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap" as const,
};

const applyButtonStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  background: "linear-gradient(135deg, #ff7a2f, #ff5c00)",
  color: "#111",
  padding: "0 18px",
  borderRadius: "14px",
  border: "none",
  fontWeight: 900,
  cursor: "pointer",
  boxShadow: "0 10px 22px rgba(255,92,0,0.25)",
};

const formStyle = {
  marginTop: "20px",
  display: "grid",
  gap: "12px",
  background: "#0b0b0b",
  padding: "20px",
  borderRadius: "18px",
  border: "1px solid rgba(255,255,255,0.1)",
};

const formTitleStyle = {
  margin: 0,
  fontSize: "20px",
};

const submitButtonStyle = {
  background: "linear-gradient(135deg, #ff7a2f, #ff5c00)",
  color: "#111",
  padding: "14px",
  borderRadius: "14px",
  border: "none",
  fontWeight: 900,
  cursor: "pointer",
};

const emptyStateStyle = {
  background: "#151515",
  padding: "30px",
  borderRadius: "22px",
  border: "1px solid rgba(255,255,255,0.09)",
};

const mutedTextStyle = {
  color: "#cfcfcf",
};
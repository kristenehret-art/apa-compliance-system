"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties } from "react";
import { createClient } from "@/lib/supabase/client";

type ArtistProfile = {
  id: string;
  user_id?: string | null;
  artist_name?: string | null;
  city?: string | null;
  state?: string | null;
  tattoo_styles?: string | null;
  looking_for?: string | null;
  bio?: string | null;
  willing_to_travel?: boolean | null;
  years_experience?: number | string | null;
  instagram_url?: string | null;
  portfolio_url?: string | null;
  email?: string | null;
  compliance_status_visible?: boolean | null;
};

type ComplianceSummary = {
  percent: number | null;
  completed: number;
  total: number;
  expired: number;
};

function getSafeWebsiteUrl(value?: string | null) {
  if (!value) return "";

  const trimmed = value.trim();

  if (!trimmed) return "";

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }

  if (trimmed.startsWith("@")) {
    return `https://instagram.com/${trimmed.replace("@", "")}`;
  }

  if (
    !trimmed.includes(".") &&
    !trimmed.includes("/") &&
    !trimmed.includes(" ")
  ) {
    return `https://instagram.com/${trimmed}`;
  }

  return `https://${trimmed}`;
}

function getComplianceLabel(summary?: ComplianceSummary) {
  if (!summary || summary.percent === null) {
    return "COMPLIANCE STATUS SHARED THROUGH APA";
  }

  if (summary.expired > 0) {
    return `${summary.percent}% COMPLIANCE COMPLETE`;
  }

  return `${summary.percent}% COMPLIANCE COMPLETE`;
}

export default function ArtistsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [artists, setArtists] = useState<ArtistProfile[]>([]);
  const [complianceSummaries, setComplianceSummaries] = useState<
    Record<string, ComplianceSummary>
  >({});
  const [loading, setLoading] = useState(true);

  const [stateFilter, setStateFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
    }
  }

  checkAuth();
}, [router, supabase]);

  useEffect(() => {
    fetchArtists();
  }, []);

  async function fetchArtists() {
    setLoading(true);

    const { data, error } = await supabase
      .from("artist_profiles")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading artists:", error);
      setArtists([]);
      setLoading(false);
      return;
    }

    const approvedArtists = (data || []) as ArtistProfile[];
    setArtists(approvedArtists);

    const sharingUserIds = Array.from(
      new Set(
        approvedArtists
          .filter((artist) => artist.compliance_status_visible && artist.user_id)
          .map((artist) => artist.user_id as string)
      )
    );

    if (sharingUserIds.length > 0) {
      const { data: complianceData, error: complianceError } = await supabase
        .from("user_compliance_items")
        .select(
          "user_id, completion_date, renewal_date, expires_date, document_name, document_url, is_inapplicable"
        )
        .in("user_id", sharingUserIds);

      if (complianceError) {
  console.warn(
    "Public compliance summaries unavailable."
  );
} else {
        const summaries: Record<string, ComplianceSummary> = {};
        const today = new Date();

        sharingUserIds.forEach((userId) => {
          const userItems = (complianceData || []).filter(
            (item: any) => item.user_id === userId && !item.is_inapplicable
          );

          const total = userItems.length;

          const completed = userItems.filter(
            (item: any) =>
              item.completion_date ||
              item.renewal_date ||
              item.expires_date ||
              item.document_name ||
              item.document_url
          ).length;

          const expired = userItems.filter((item: any) => {
            if (!item.expires_date) return false;
            return new Date(item.expires_date) < today;
          }).length;

          summaries[userId] = {
            total,
            completed,
            expired,
            percent: total > 0 ? Math.round((completed / total) * 100) : null,
          };
        });

        setComplianceSummaries(summaries);
      }
    }

    setLoading(false);
  }

  const states = useMemo(() => {
    const uniqueStates = artists
      .map((artist) => artist.state)
      .filter((state): state is string => Boolean(state));

    return ["All", ...Array.from(new Set(uniqueStates)).sort()];
  }, [artists]);

  const filteredArtists = artists.filter((artist) => {
    const matchesState = stateFilter === "All" || artist.state === stateFilter;
    const search = searchTerm.toLowerCase();

    const matchesSearch =
      !search ||
      artist.artist_name?.toLowerCase().includes(search) ||
      artist.city?.toLowerCase().includes(search) ||
      artist.state?.toLowerCase().includes(search) ||
      artist.tattoo_styles?.toLowerCase().includes(search) ||
      artist.looking_for?.toLowerCase().includes(search) ||
      artist.bio?.toLowerCase().includes(search);

    return matchesState && matchesSearch;
  });

  return (
    <main style={pageStyle}>
      <div style={containerStyle}>
        <section style={heroStyle}>
          <p style={eyebrowStyle}>ARTIST PROTECTION ALLIANCE</p>

          <h1 style={heroTitleStyle}>Artists Open to Work</h1>

          <p style={heroTextStyle}>
            Discover tattoo artists and piercers available for guest spots,
            studio positions, conventions, travel opportunities, and
            collaborative work.
          </p>

          <a href="/artists/post" style={heroButtonStyle}>
            Create Open to Work Profile
          </a>
        </section>

        <section style={filterCardStyle}>
          <div>
            <p style={sectionEyebrowStyle}>BROWSE ARTISTS</p>
            <h2 style={sectionTitleStyle}>Find artists</h2>
            <p style={sectionSubTextStyle}>
              Search by artist name, city, state, style, or availability.
            </p>
          </div>

          <div style={filterGridStyle}>
            <input
              placeholder="Search by style, city, artist, keyword..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />

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

          <p style={resultsCountStyle}>
            Showing {filteredArtists.length} of {artists.length} approved
            artists.
          </p>
        </section>

        {loading ? (
          <p style={loadingStyle}>Loading artists...</p>
        ) : filteredArtists.length === 0 ? (
          <section style={emptyStateStyle}>
            <h2 style={{ marginTop: 0 }}>No matching artists found.</h2>
            <p style={{ color: "#cfcfcf", marginBottom: 0 }}>
              Try changing your filters or check back soon.
            </p>
          </section>
        ) : (
          <section style={resultsGridStyle}>
            {filteredArtists.map((artist) => {
              const complianceSummary = artist.user_id
                ? complianceSummaries[artist.user_id]
                : undefined;

              return (
                <article key={artist.id} style={artistCardStyle}>
                  <div style={badgeStyle}>
                    {artist.looking_for || "Artist Open to Work"}
                  </div>

                  <h2 style={artistNameStyle}>{artist.artist_name}</h2>

                  <p style={locationStyle}>
                    {artist.city || "Location TBD"}
                    {artist.state ? `, ${artist.state}` : ""}
                  </p>

                  <div style={pillRowStyle}>
                    {artist.willing_to_travel && (
  <span style={pillStyle}>{artist.willing_to_travel}</span>
)}

                    {artist.looking_for && (
                      <span style={pillStyle}>OPEN TO OPPORTUNITIES</span>
                    )}

                    {artist.years_experience && (
                      <span style={pillStyle}>
                        {artist.years_experience}+ YEARS
                      </span>
                    )}

                    {artist.compliance_status_visible && (
                      <span style={compliancePillStyle}>
                        {getComplianceLabel(complianceSummary)}
                      </span>
                    )}
                  </div>

                  {artist.compliance_status_visible && (
  <Link
  href={`/compliance/public/${artist.id}?from=artists`}
    style={{
      textDecoration: "none",
      display: "block",
    }}
  >
    <div style={complianceCardStyle}>
      <p style={complianceTitleStyle}>
        Compliance status shared through APA →
      </p>

      <p style={complianceTextStyle}>
        This artist has chosen to make their APA compliance
        status visible publicly. Detailed documents remain
        private.
      </p>
    </div>
  </Link>
)}

                  {artist.tattoo_styles && (
                    <p style={detailTextStyle}>
                      <strong style={{ color: "#fff" }}>Styles:</strong>{" "}
                      {artist.tattoo_styles}
                    </p>
                  )}

                  {artist.bio && <p style={bioStyle}>{artist.bio}</p>}

                  <div style={buttonRowStyle}>
                    {artist.instagram_url && (
                      <a
                        href={getSafeWebsiteUrl(artist.instagram_url)}
                        target="_blank"
                        rel="noreferrer"
                        style={linkButtonStyle}
                      >
                        Instagram
                      </a>
                    )}

                    {artist.portfolio_url && (
                      <a
                        href={getSafeWebsiteUrl(artist.portfolio_url)}
                        target="_blank"
                        rel="noreferrer"
                        style={linkButtonStyle}
                      >
                        Portfolio
                      </a>
                    )}

                    {artist.email && (
                      <a
                        href={`mailto:${artist.email}`}
                        style={primaryLinkButtonStyle}
                      >
                        Contact Artist
                      </a>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top left, rgba(255,92,0,0.14), transparent 28%), linear-gradient(180deg, #0b0502 0%, #050505 40%, #050505 100%)",
  color: "white",
  padding: "32px 20px 64px",
};

const containerStyle: CSSProperties = {
  maxWidth: "1050px",
  margin: "0 auto",
};

const heroStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(22,22,22,0.96), rgba(8,8,8,0.98))",
  border: "1px solid rgba(255,92,0,0.34)",
  borderRadius: "22px",
  padding: "30px",
  marginBottom: "24px",
  boxShadow:
    "0 18px 45px rgba(0,0,0,0.48), 0 0 28px rgba(255,92,0,0.09)",
};

const eyebrowStyle: CSSProperties = {
  color: "#ff5c00",
  letterSpacing: "2.4px",
  fontWeight: 800,
  fontSize: "11px",
  margin: "0 0 10px",
};

const heroTitleStyle: CSSProperties = {
  fontSize: "clamp(34px, 5vw, 52px)",
  lineHeight: 1,
  margin: "0 0 14px",
  fontWeight: 900,
};

const heroTextStyle: CSSProperties = {
  color: "#d7d7d7",
  fontSize: "16px",
  maxWidth: "720px",
  lineHeight: 1.55,
  margin: "0 0 22px",
};

const heroButtonStyle: CSSProperties = {
  display: "inline-block",
  background: "#ff5c00",
  color: "#fff",
  padding: "12px 18px",
  borderRadius: "13px",
  fontWeight: "bold",
  fontSize: "14px",
  textDecoration: "none",
  boxShadow: "0 0 22px rgba(255,92,0,0.28)",
};

const filterCardStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.96), rgba(12,12,12,0.98))",
  padding: "22px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.1)",
  marginBottom: "24px",
  display: "grid",
  gap: "16px",
  boxShadow: "0 14px 36px rgba(0,0,0,0.38)",
};

const sectionEyebrowStyle: CSSProperties = {
  color: "#ff5c00",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "2px",
  margin: "0 0 6px",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: "28px",
  lineHeight: 1.1,
  fontWeight: 900,
};

const sectionSubTextStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#b8b8b8",
  fontSize: "14px",
};

const filterGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.5fr) minmax(170px, 0.7fr)",
  gap: "12px",
};

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: "#0d0d0d",
  color: "white",
  outline: "none",
  boxSizing: "border-box",
  fontSize: "14px",
};

const resultsCountStyle: CSSProperties = {
  color: "#a7a7a7",
  margin: 0,
  fontSize: "14px",
};

const loadingStyle: CSSProperties = {
  color: "#cfcfcf",
  fontSize: "16px",
};

const emptyStateStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.96), rgba(12,12,12,0.98))",
  padding: "24px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.12)",
};

const resultsGridStyle: CSSProperties = {
  display: "grid",
  gap: "18px",
};

const artistCardStyle: CSSProperties = {
  background:
    "linear-gradient(135deg, rgba(24,24,24,0.96), rgba(13,13,13,0.98))",
  padding: "22px",
  borderRadius: "20px",
  border: "1px solid rgba(255,255,255,0.1)",
  boxShadow: "0 14px 36px rgba(0,0,0,0.38)",
};

const badgeStyle: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "8px",
  background: "rgba(255,92,0,0.12)",
  border: "1px solid rgba(255,92,0,0.42)",
  color: "#ff5c00",
  padding: "7px 11px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "11px",
  marginBottom: "14px",
};

const artistNameStyle: CSSProperties = {
  fontSize: "clamp(26px, 4vw, 36px)",
  lineHeight: 1.05,
  margin: "0 0 8px",
  fontWeight: 900,
};

const locationStyle: CSSProperties = {
  color: "#d0d0d0",
  fontSize: "16px",
  margin: "0 0 16px",
};

const pillRowStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: "8px",
  marginBottom: "16px",
};

const pillStyle: CSSProperties = {
  background: "rgba(255,92,0,0.1)",
  border: "1px solid rgba(255,92,0,0.3)",
  color: "#ff5c00",
  padding: "7px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "11px",
};

const compliancePillStyle: CSSProperties = {
  background: "rgba(34,197,94,0.1)",
  border: "1px solid rgba(34,197,94,0.34)",
  color: "#4ade80",
  padding: "7px 10px",
  borderRadius: "999px",
  fontWeight: "bold",
  fontSize: "11px",
};

const complianceCardStyle: CSSProperties = {
  marginTop: "2px",
  marginBottom: "16px",
  padding: "12px 14px",
  borderRadius: "14px",
  background: "rgba(34,197,94,0.07)",
  border: "1px solid rgba(34,197,94,0.22)",
};

const complianceTitleStyle: CSSProperties = {
  color: "#ffffff",
  fontWeight: 800,
  margin: "0 0 5px",
  fontSize: "13px",
};

const complianceTextStyle: CSSProperties = {
  color: "#cfcfcf",
  margin: 0,
  lineHeight: 1.55,
  fontSize: "13px",
};

const detailTextStyle: CSSProperties = {
  marginTop: "10px",
  color: "#d8d8d8",
  fontSize: "15px",
};

const bioStyle: CSSProperties = {
  marginTop: "14px",
  lineHeight: "1.65",
  color: "#d6d6d6",
  fontSize: "14px",
  maxWidth: "850px",
};

const buttonRowStyle: CSSProperties = {
  marginTop: "20px",
  display: "flex",
  gap: "10px",
  flexWrap: "wrap",
};

const linkButtonStyle: CSSProperties = {
  color: "#ff5c00",
  fontWeight: "bold",
  textDecoration: "none",
  border: "1px solid rgba(255,92,0,0.35)",
  padding: "9px 13px",
  borderRadius: "11px",
  background: "rgba(255,92,0,0.06)",
  fontSize: "14px",
};

const primaryLinkButtonStyle: CSSProperties = {
  background: "#ff5c00",
  color: "#fff",
  textDecoration: "none",
  padding: "9px 14px",
  borderRadius: "11px",
  fontWeight: "bold",
  fontSize: "14px",
  boxShadow: "0 0 18px rgba(255,92,0,0.24)",
};
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";

export default function ArtistsPage() {
  const [artists, setArtists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [stateFilter, setStateFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchArtists();
  }, []);

  async function fetchArtists() {
    const { data, error } = await supabase
      .from("artist_profiles")
      .select("*")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading artists:", error);
    }

    setArtists(data || []);
    setLoading(false);
  }

  const states = useMemo(() => {
    const uniqueStates = artists.map((artist) => artist.state).filter(Boolean);
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
    <main style={{ minHeight: "100vh", background: "#0f0f0f", color: "white", padding: "40px" }}>
      <div style={{ maxWidth: "1100px", margin: "0 auto" }}>
        <h1 style={{ fontSize: "42px", marginBottom: "10px" }}>
          Artists Open to Work
        </h1>

        <p style={{ color: "#cfcfcf", fontSize: "18px", marginBottom: "30px" }}>
          Discover tattoo artists open to shop positions, guest spots, conventions, and travel opportunities.
        </p>

        <a
          href="/artists/post"
          style={{
            display: "inline-block",
            background: "#d4af37",
            color: "#111",
            padding: "14px 22px",
            borderRadius: "12px",
            fontWeight: "bold",
            textDecoration: "none",
            marginBottom: "30px",
          }}
        >
          Create Open to Work Profile
        </a>

        <div style={{ background: "#1a1a1a", padding: "20px", borderRadius: "18px", border: "1px solid #333", marginBottom: "30px", display: "grid", gap: "14px" }}>
          <h2 style={{ margin: 0 }}>Find artists</h2>

          <input
            placeholder="Search by style, city, artist, keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={inputStyle}
          />

          <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} style={inputStyle}>
            {states.map((state) => (
              <option key={state}>{state}</option>
            ))}
          </select>

          <p style={{ color: "#999", margin: 0 }}>
            Showing {filteredArtists.length} of {artists.length} approved artists.
          </p>
        </div>

        {loading ? (
          <p>Loading artists...</p>
        ) : filteredArtists.length === 0 ? (
          <div style={{ background: "#1a1a1a", padding: "30px", borderRadius: "18px", border: "1px solid #333" }}>
            <h2>No matching artists found.</h2>
            <p style={{ color: "#cfcfcf" }}>Try changing your filters or check back soon.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: "20px" }}>
            {filteredArtists.map((artist) => (
              <div key={artist.id} style={{ background: "#1a1a1a", padding: "24px", borderRadius: "18px", border: "1px solid #333" }}>
                <p style={{ color: "#d4af37", fontWeight: "bold" }}>
                  {artist.looking_for || "Open to Work"}
                </p>

                <h2 style={{ fontSize: "26px", marginBottom: "8px" }}>
                  {artist.artist_name}
                </h2>

                <p style={{ color: "#cfcfcf" }}>
                  {artist.city || "Location TBD"}, {artist.state || ""}
                </p>

                {artist.tattoo_styles && (
                  <p style={{ marginTop: "12px" }}>
                    <strong>Styles:</strong> {artist.tattoo_styles}
                  </p>
                )}

                {artist.years_experience && (
                  <p style={{ marginTop: "12px", color: "#cfcfcf" }}>
                    <strong>Experience:</strong> {artist.years_experience}
                  </p>
                )}

                {artist.willing_to_travel && (
                  <p style={{ marginTop: "12px", color: "#cfcfcf" }}>
                    <strong>Travel:</strong> {artist.willing_to_travel}
                  </p>
                )}

                {artist.bio && (
                  <p style={{ marginTop: "15px", lineHeight: "1.6" }}>
                    {artist.bio}
                  </p>
                )}

                <div style={{ marginTop: "15px", display: "flex", gap: "14px", flexWrap: "wrap" }}>
                  {artist.instagram_url && (
                    <a href={artist.instagram_url} target="_blank" rel="noreferrer" style={{ color: "#d4af37", fontWeight: "bold" }}>
                      Instagram
                    </a>
                  )}

                  {artist.portfolio_url && (
                    <a href={artist.portfolio_url} target="_blank" rel="noreferrer" style={{ color: "#d4af37", fontWeight: "bold" }}>
                      Portfolio
                    </a>
                  )}

                  {artist.email && (
                    <a href={`mailto:${artist.email}`} style={{ color: "#d4af37", fontWeight: "bold" }}>
                      Contact Artist
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#111",
  color: "white",
};
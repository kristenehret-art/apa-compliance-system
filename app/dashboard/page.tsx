"use client";

import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";

type Quote = {
  quote_slug: string;
  shop_name: string;
  artist_name: string | null;
  client_name: string;
  client_email: string;
  tattoo_description: string;
  total: number;
  status: string | null;
  deposit_required: boolean | null;
  deposit_amount: number | null;
  deposit_paid: boolean | null;
  booking_link: string | null;
  accepted_at: string | null;
  booked_at: string | null;
  deposit_paid_at: string | null;
  created_at?: string | null;
};

function TimelineItem({
  label,
  complete,
  date,
}: {
  label: string;
  complete: boolean;
  date?: string | null;
}) {
  return (
    <div style={timelineItem}>
      <span
        style={{
          ...timelineDot,
          background: complete ? "#ff5c00" : "#ccc",
        }}
      />
      <div>
        <strong>{label}</strong>
        <p style={timelineSmallText}>
          {complete
            ? date
              ? new Date(date).toLocaleString()
              : "Completed"
            : "Not completed yet"}
        </p>
      </div>
    </div>
  );
}

export default function ArtistDashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Connecting live updates...");
  const [recentlyUpdated, setRecentlyUpdated] = useState<string[]>([]);
  const [lastUpdatedMessage, setLastUpdatedMessage] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();

    const channel = supabase
      .channel("artist-dashboard-live-quotes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "quotes",
        },
        (payload) => {
          console.log("LIVE DASHBOARD UPDATE:", payload);
          setLiveStatus("Live update received");

          if (payload.eventType === "INSERT") {
            const newQuote = payload.new as Quote;

            setQuotes((currentQuotes) => {
              const alreadyExists = currentQuotes.some(
                (q) => q.quote_slug === newQuote.quote_slug
              );

              if (alreadyExists) return currentQuotes;

              return [newQuote, ...currentQuotes];
            });

            triggerHighlight(newQuote.quote_slug, newQuote.client_name);
          }

          if (payload.eventType === "UPDATE") {
            const updatedQuote = payload.new as Quote;

            setQuotes((currentQuotes) => {
              const withoutUpdated = currentQuotes.filter(
                (quote) => quote.quote_slug !== updatedQuote.quote_slug
              );

              return [updatedQuote, ...withoutUpdated];
            });

            triggerHighlight(updatedQuote.quote_slug, updatedQuote.client_name);
          }

          if (payload.eventType === "DELETE") {
            const deletedQuote = payload.old as Quote;

            setQuotes((currentQuotes) =>
              currentQuotes.filter(
                (quote) => quote.quote_slug !== deletedQuote.quote_slug
              )
            );
          }

          setTimeout(() => {
            setLiveStatus("Live updates active");
          }, 2000);
        }
      )
      .subscribe((status) => {
        console.log("REALTIME STATUS:", status);

        if (status === "SUBSCRIBED") {
          setLiveStatus("Live updates active");
        }

        if (status === "CHANNEL_ERROR") {
          setLiveStatus("Live updates need Supabase Realtime enabled");
        }

        if (status === "TIMED_OUT") {
          setLiveStatus("Live updates timed out");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  function triggerHighlight(slug: string, clientName?: string) {
    setRecentlyUpdated((current) => {
      if (current.includes(slug)) return current;
      return [...current, slug];
    });

    if (clientName) {
      setLastUpdatedMessage(`${clientName}'s quote was just updated`);
    } else {
      setLastUpdatedMessage("A quote was just updated");
    }

    setTimeout(() => {
      setRecentlyUpdated((current) => current.filter((s) => s !== slug));
      setLastUpdatedMessage(null);
    }, 10000);
  }

  async function loadQuotes() {
    setLoading(true);

    const { data, error } = await supabase
      .from("quotes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("DASHBOARD LOAD ERROR:", error);
      alert("Could not load dashboard.");
      setLoading(false);
      return;
    }

    setQuotes(data || []);
    setLoading(false);
  }

  function getQuoteUrl(slug: string) {
    if (typeof window === "undefined") return `/quote/${slug}`;
    return `${window.location.origin}/quote/${slug}`;
  }

  async function copyQuoteLink(slug: string) {
    const quoteUrl = getQuoteUrl(slug);
    await navigator.clipboard.writeText(quoteUrl);
    setCopiedSlug(slug);
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  function getQuoteStage(q: Quote) {
    const status = (q.status || "").toLowerCase().trim();

    if (status === "booked" || q.booked_at) return "booked";
    if (status === "accepted" || q.accepted_at) return "accepted";
    return "pending";
  }

  const filteredQuotes = quotes.filter((q) => {
    const stage = getQuoteStage(q);

    if (filter === "all") return true;
    if (filter === "pending") return stage === "pending";
    if (filter === "accepted") return stage === "accepted";
    if (filter === "booked") return stage === "booked";
    if (filter === "deposit")
      return q.deposit_required === true && q.deposit_paid !== true;

    return true;
  });

  function statusBadge(quote: Quote) {
    const stage = getQuoteStage(quote);

    if (stage === "booked") return "Booked";
    if (stage === "accepted") return "Accepted";
    return "Sent / Pending";
  }

  function depositBadge(quote: Quote) {
    if (!quote.deposit_required) return "No deposit";
    if (quote.deposit_paid) return "Deposit received";
    return "Deposit pending";
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerRow}>
          <div>
            <h1 style={{ color: "#ff5c00", marginTop: 0, marginBottom: 6 }}>
              Artist Dashboard
            </h1>
            <p style={liveText}>● {liveStatus}</p>
          </div>

          <button onClick={loadQuotes} style={refreshButton}>
            Refresh
          </button>
        </div>

        <div style={filterRow}>
          {["all", "pending", "accepted", "booked", "deposit"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                ...filterButton,
                background: filter === f ? "#ff5c00" : "#f2f2f2",
                color: filter === f ? "#fff" : "#111",
              }}
            >
              {f.toUpperCase()}
            </button>
          ))}
        </div>

        {lastUpdatedMessage && (
          <div style={liveUpdateBanner}>
            🔥 {lastUpdatedMessage}
          </div>
        )}

        {loading ? (
          <div style={emptyState}>
            <h3>Loading dashboard...</h3>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div style={emptyState}>
            <h3>No quotes found for this filter.</h3>
            <p style={{ marginBottom: 0 }}>
              Try clicking <strong>ALL</strong> to see every quote.
            </p>
          </div>
        ) : (
          <div style={grid}>
            {filteredQuotes.map((quote) => {
              const quoteUrl = getQuoteUrl(quote.quote_slug);
              const stage = getQuoteStage(quote);
              const isRecentlyUpdated = recentlyUpdated.includes(quote.quote_slug);

              return (
                <div
                  key={quote.quote_slug}
                  style={{
                    ...card,
                    ...(isRecentlyUpdated ? updatedCard : {}),
                  }}
                >
                  {isRecentlyUpdated && <div style={updatedBadge}>JUST UPDATED</div>}

                  <div style={{ flex: 1 }}>
                    <h3 style={{ marginTop: 0 }}>{quote.client_name}</h3>

                    <p>{quote.tattoo_description}</p>

                    <p>
                      <strong>${Number(quote.total || 0).toFixed(0)}</strong>
                    </p>

                    <p>
                      <strong>Status:</strong> {statusBadge(quote)}
                    </p>

                    <p>
                      <strong>Deposit:</strong> {depositBadge(quote)}
                      {quote.deposit_amount
                        ? ` ($${Number(quote.deposit_amount).toFixed(0)})`
                        : ""}
                    </p>

                    <div style={timelineBox}>
                      <h4 style={{ margin: "0 0 10px", color: "#ff5c00" }}>
                        Client Timeline
                      </h4>

                      <TimelineItem label="Quote Sent" complete={true} date={quote.created_at} />
                      <TimelineItem
                        label="Quote Accepted"
                        complete={stage === "accepted" || stage === "booked"}
                        date={quote.accepted_at}
                      />

                      {quote.deposit_required && (
                        <TimelineItem
                          label="Deposit Sent / Received"
                          complete={quote.deposit_paid === true}
                          date={quote.deposit_paid_at}
                        />
                      )}

                      <TimelineItem
                        label="Appointment Booked"
                        complete={stage === "booked"}
                        date={quote.booked_at}
                      />
                    </div>
                  </div>

                  <div style={actions}>
                    <a href={quoteUrl} target="_blank" rel="noreferrer" style={darkButton}>
                      View Quote
                    </a>

                    <button onClick={() => copyQuoteLink(quote.quote_slug)} style={lightButton}>
                      {copiedSlug === quote.quote_slug ? "Copied!" : "Copy Link"}
                    </button>

                    <button
                      onClick={async () => {
                        const res = await fetch("/api/send-quote", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            shopName: quote.shop_name,
                            tattooerName: quote.artist_name,
                            clientName: quote.client_name,
                            clientEmail: quote.client_email,
                            tattooDescription: quote.tattoo_description,
                            total: quote.total,
                            quoteLink: quoteUrl,
                            depositRequired: quote.deposit_required,
                            depositAmount: quote.deposit_amount,
                          }),
                        });

                        if (!res.ok) {
                          alert("Failed to resend.");
                          return;
                        }

                        alert("Quote resent.");
                      }}
                      style={lightButton}
                    >
                      Resend Email
                    </button>

                    {quote.deposit_required && !quote.deposit_paid && (
                      <button
                        onClick={async () => {
                          const { error } = await supabase
                            .from("quotes")
                            .update({
                              deposit_paid: true,
                              deposit_paid_at: new Date().toISOString(),
                            })
                            .eq("quote_slug", quote.quote_slug);

                          if (error) {
                            alert("Failed to update.");
                            return;
                          }

                          triggerHighlight(quote.quote_slug, quote.client_name);
                          loadQuotes();
                        }}
                        style={accentButton}
                      >
                        Mark Deposit Received
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const liveUpdateBanner = {
  background: "#ff5c00",
  color: "#fff",
  padding: "12px 14px",
  borderRadius: 12,
  fontWeight: "bold" as const,
  marginBottom: 16,
  boxShadow: "0 0 18px rgba(255, 92, 0, 0.55)",
};

const updatedCard = {
  boxShadow: "0 0 0 4px #ff5c00, 0 0 35px rgba(255, 92, 0, 0.75)",
  transform: "scale(1.015)",
  border: "2px solid #ff5c00",
};

const pageStyle = {
  padding: 24,
  background: "#0f0f0f",
  minHeight: "100vh",
  color: "#fff",
};

const containerStyle = {
  maxWidth: 1000,
  margin: "0 auto",
};

const headerRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  marginBottom: 18,
  flexWrap: "wrap" as const,
};

const liveText = {
  margin: 0,
  color: "#b8b8b8",
  fontSize: 14,
};

const refreshButton = {
  background: "#ff5c00",
  color: "#fff",
  padding: "9px 14px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold" as const,
};

const filterRow = {
  display: "flex",
  gap: 8,
  marginBottom: 20,
  flexWrap: "wrap" as const,
};

const filterButton = {
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold" as const,
};

const emptyState = {
  background: "#fff",
  color: "#111",
  padding: 24,
  borderRadius: 14,
  border: "1px solid #e5e5e5",
};

const grid = {
  display: "grid",
  gap: 16,
};

const card = {
  background: "#fff",
  color: "#111",
  padding: 16,
  borderRadius: 12,
  display: "flex",
  justifyContent: "space-between",
  gap: 18,
  flexWrap: "wrap" as const,
  position: "relative" as const,
  transition: "all 0.3s ease",
};

const updatedBadge = {
  position: "absolute" as const,
  top: 12,
  right: 12,
  background: "#ff5c00",
  color: "#fff",
  padding: "5px 8px",
  borderRadius: 999,
  fontSize: 11,
  fontWeight: "bold" as const,
};

const actions = {
  display: "flex",
  flexDirection: "column" as const,
  gap: 8,
  minWidth: 170,
};

const darkButton = {
  background: "#111",
  color: "#fff",
  padding: "8px 12px",
  textDecoration: "none",
  borderRadius: 8,
  textAlign: "center" as const,
  fontWeight: "bold" as const,
};

const lightButton = {
  background: "#f2f2f2",
  color: "#111",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #ccc",
  cursor: "pointer",
  fontWeight: "bold" as const,
};

const accentButton = {
  background: "#ff5c00",
  color: "#fff",
  padding: "8px 12px",
  borderRadius: 8,
  border: "none",
  cursor: "pointer",
  fontWeight: "bold" as const,
};

const timelineBox = {
  marginTop: 16,
  padding: 14,
  borderRadius: 12,
  background: "#f7f7f7",
  border: "1px solid #e5e5e5",
};

const timelineItem = {
  display: "flex",
  gap: 10,
  alignItems: "flex-start",
  marginBottom: 10,
};

const timelineDot = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  marginTop: 4,
  flexShrink: 0,
};

const timelineSmallText = {
  margin: "3px 0 0",
  color: "#666",
  fontSize: 12,
};
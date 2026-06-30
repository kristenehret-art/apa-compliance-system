"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AllianceGate from "../../components/AllianceGate";

const supabase = createClient();


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
  deposit_due_hours: number | null;
  deposit_reminder_sent: boolean | null;
  deposit_reminder_sent_at: string | null;
  manual_deposit_reminder_sent_at?: string | null;
  manual_deposit_reminder_count?: number | null;

  created_at?: string | null;
  updated_at?: string | null;
  archived_at?: string | null;
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

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value || 0);
}

function getDepositReminderHour(depositDueHours: number | null) {
  if (!depositDueHours) return null;

  if (depositDueHours === 12) return 10;
  if (depositDueHours === 24) return 20;
  if (depositDueHours === 48) return 42;

  return Math.max(depositDueHours - 4, 1);
}

function getLastActivityDate(q: Quote) {
  return (
    q.deposit_paid_at ||
    q.booked_at ||
    q.accepted_at ||
    q.updated_at ||
    q.created_at ||
    ""
  );
}

function sortNewestActivityFirst(input: Quote[]) {
  return [...input].sort((a, b) => {
    const aTime = new Date(getLastActivityDate(a)).getTime() || 0;
    const bTime = new Date(getLastActivityDate(b)).getTime() || 0;

    return bTime - aTime;
  });
}

export default function ArtistDashboardPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [archivedQuotes, setArchivedQuotes] = useState<Quote[]>([]);
  const [showArchivedQuotes, setShowArchivedQuotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState("Live");
  const [recentlyUpdated, setRecentlyUpdated] = useState<string[]>([]);
  const [lastUpdatedMessage, setLastUpdatedMessage] = useState<string | null>(
    null
  );

  const [isAllianceMember, setIsAllianceMember] = useState(false);
useEffect(() => {
  async function loadMembership() {
    try {
      const { data: authData } = await supabase.auth.getUser();

      const user = authData?.user;

      if (!user) {
        setIsAllianceMember(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("membership_tier")
        .eq("id", user.id)
        .single();
        console.log("USER ID:", user.id);
        console.log("PROFILE:", profile);
        console.log("MEMBERSHIP:", profile?.membership_tier);

      setIsAllianceMember(
        profile?.membership_tier === "alliance" ||
        profile?.membership_tier === "admin"
      );
    } catch (error) {
      console.error("DASHBOARD MEMBERSHIP ERROR:", error);
      setIsAllianceMember(false);
    }
  }

  loadMembership();
}, []);
  useEffect(() => {
    loadQuotes();

    const interval = window.setInterval(() => {
      loadQuotes(true);
    }, 5000);

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

          const changedQuote = payload.new as Quote | null;

          if (changedQuote?.quote_slug) {
            triggerHighlight(changedQuote.quote_slug, changedQuote.client_name);
          }

          loadQuotes(true);

          setTimeout(() => {
            setLiveStatus("Live");
          }, 2000);
        }
      )
      .subscribe();

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, []);

  function triggerHighlight(slug: string, clientName?: string) {
    setRecentlyUpdated((current) => {
      if (current.includes(slug)) return current;
      return [...current, slug];
    });

    setLastUpdatedMessage(
      clientName ? `${clientName}'s quote was just updated` : "A quote was just updated"
    );

    setTimeout(() => {
      setRecentlyUpdated((current) => current.filter((s) => s !== slug));
      setLastUpdatedMessage(null);
    }, 8000);
  }

async function loadQuotes(silent = false) {
  if (!silent) setLoading(true);

  const { data: activeData, error: activeError } = await supabase
    .from("quotes")
    .select("*")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  const { data: archivedData, error: archivedError } = await supabase
    .from("quotes")
    .select("*")
    .not("archived_at", "is", null)
    .order("archived_at", { ascending: false });

  if (activeError || archivedError) {
    console.error("DASHBOARD LOAD ERROR:", activeError || archivedError);
    alert("Could not load dashboard.");
    if (!silent) setLoading(false);
    return;
  }

  setQuotes(sortNewestActivityFirst((activeData as Quote[]) || []));
  setArchivedQuotes(
    sortNewestActivityFirst((archivedData as Quote[]) || [])
  );

  if (!silent) setLoading(false);
}

  function getQuoteUrl(slug: string) {
    const appBaseUrl = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://apa-compliance-system-y9th.vercel.app"
).replace(/\/$/, "");

return `${appBaseUrl}/quote/${slug}`;
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

  async function archiveQuote(quote: Quote) {
    const confirmed = window.confirm(
      `Archive quote for ${quote.client_name}? It will be removed from the active dashboard but can still be recovered later.`
    );

    if (!confirmed) return;

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("quotes")
      .update({
        archived_at: now,
        updated_at: now,
      })
      .eq("quote_slug", quote.quote_slug);

    if (error) {
      console.error("ARCHIVE QUOTE ERROR:", error);
      alert("Could not archive quote.");
      return;
    }

    setQuotes((current) =>
      current.filter((q) => q.quote_slug !== quote.quote_slug)
    );

    setLastUpdatedMessage(`${quote.client_name}'s quote was archived`);
    setTimeout(() => setLastUpdatedMessage(null), 5000);
  }

    const projectedIncome = quotes.reduce((sum, quote) => {
    return sum + Number(quote.total || 0);
  }, 0);

  const depositsCollected = quotes.reduce((sum, quote) => {
    if (quote.deposit_paid === true) {
      return sum + Number(quote.deposit_amount || 0);
    }

    return sum;
  }, 0);

  const pendingDeposits = quotes.reduce((sum, quote) => {
    if (quote.deposit_required === true && quote.deposit_paid !== true) {
      return sum + Number(quote.deposit_amount || 0);
    }

    return sum;
  }, 0);

  const openQuotesCount = quotes.length;

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
async function restoreQuote(quote: Quote) {
  const confirmed = window.confirm(
    `Restore quote for ${quote.client_name}? It will return to the active dashboard.`
  );

  if (!confirmed) return;

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("quotes")
    .update({
      archived_at: null,
      updated_at: now,
    })
    .eq("quote_slug", quote.quote_slug);

  if (error) {
    console.error("RESTORE QUOTE ERROR:", error);
    alert("Could not restore quote.");
    return;
  }

  await loadQuotes(true);

  setLastUpdatedMessage(`${quote.client_name}'s quote was restored`);
  setTimeout(() => setLastUpdatedMessage(null), 5000);
}
  function statusBadge(quote: Quote) {
    const stage = getQuoteStage(quote);

    if (stage === "booked") return "Booked";
    if (stage === "accepted") return "Accepted";
    return "Pending Review";
  }

  function depositBadge(quote: Quote) {
    if (!quote.deposit_required) return "No deposit";
    if (quote.deposit_paid) return "Deposit Confirmed";
    return "Awaiting Deposit";
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div style={headerRow}>
          <div>
            <h1 style={{ color: "#ff5c00", marginTop: 0, marginBottom: 6 }}>
              Client Quote Dashboard
            </h1>
            <p style={liveText}>● {liveStatus}</p>
          </div>

          <button onClick={() => loadQuotes()} style={refreshButton}>
            Refresh Dashboard
          </button>
        </div>

                <div style={snapshotGrid}>
          <div style={snapshotCard}>
            <p style={snapshotLabel}>Projected Income</p>
            <strong style={snapshotValue}>{formatMoney(projectedIncome)}</strong>
          </div>

          <div style={snapshotCard}>
            <p style={snapshotLabel}>Deposits Collected</p>
            <strong style={snapshotValue}>{formatMoney(depositsCollected)}</strong>
          </div>

          <div style={snapshotCard}>
            <p style={snapshotLabel}>Pending Deposits</p>
            <strong style={snapshotValue}>{formatMoney(pendingDeposits)}</strong>
          </div>

          <div style={snapshotCard}>
            <p style={snapshotLabel}>Open Quotes</p>
            <strong style={snapshotValue}>{openQuotesCount}</strong>
          </div>
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
          <div style={liveUpdateBanner}>🔥 {lastUpdatedMessage}</div>
        )}
<AllianceGate
  allowed={isAllianceMember}
  title="Alliance Dashboard Tools"
  description="Alliance members can manage quots, appointment workflows, and live quote activity from one dashboard."
>
        {loading ? (
          <div style={emptyState}>
            <h3>Loading dashboard...</h3>
          </div>
        ) : filteredQuotes.length === 0 ? (
          <div style={emptyState}>
            <h3>No client quotes found.</h3>
            <p style={{ marginBottom: 0 }}>
              Try another filter or create a new client quote.
            </p>
          </div>
        ) : (
          <div style={grid}>
            {filteredQuotes.map((quote) => {
              const quoteUrl = getQuoteUrl(quote.quote_slug);
              const stage = getQuoteStage(quote);
              const isRecentlyUpdated = recentlyUpdated.includes(
                quote.quote_slug
              );

              return (
                <div
                  key={quote.quote_slug}
                  style={{
                    ...card,
                    ...(isRecentlyUpdated ? updatedCard : {}),
                  }}
                >
                  {isRecentlyUpdated && (
                    <div style={updatedBadge}>JUST UPDATED</div>
                  )}

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

                      <TimelineItem
                        label="Quote Sent"
                        complete={true}
                        date={quote.created_at}
                      />
                      <TimelineItem
                        label="Quote Accepted"
                        complete={stage === "accepted" || stage === "booked"}
                        date={quote.accepted_at}
                      />

                      {quote.deposit_required && (
                        <TimelineItem
                          label="Deposit Confirmed"
                          complete={quote.deposit_paid === true}
                          date={quote.deposit_paid_at}
                        />
                      )}
                      {quote.deposit_required && !quote.deposit_paid && (
                        <div style={depositReminderBox}>
                          <strong style={{ color: "#ff5c00" }}>
                            Deposit Reminder
                          </strong>
                          <p style={depositReminderText}>
                            {quote.deposit_reminder_sent ? (
                              <>
                                Automatic reminder sent
                                {quote.deposit_reminder_sent_at
                                  ? ` on ${new Date(
                                      quote.deposit_reminder_sent_at
                                    ).toLocaleString()}`
                                  : "."}
                              </>
                            ) : (
                              <>
  Automatic reminder scheduled at hour{" "}
  {getDepositReminderHour(quote.deposit_due_hours) ?? "—"} of the{" "}
  {quote.deposit_due_hours ?? "—"} hour deposit deadline
  {quote.deposit_due_hours && getDepositReminderHour(quote.deposit_due_hours)
    ? ` (${quote.deposit_due_hours - getDepositReminderHour(quote.deposit_due_hours)!} hours before the deadline).`
    : "."}
</>
                            )}
                          </p>
                        </div>
                      )}
                      

                      <TimelineItem
                        label="Appointment Booked"
                        complete={stage === "booked"}
                        date={quote.booked_at}
                      />
                    </div>
                  </div>

                  <div style={actions}>
                    <a
                      href={quoteUrl}
                      target="_blank"
                      rel="noreferrer"
                      style={darkButton}
                    >
                      View Quote
                    </a>

                    <button
                      onClick={() => copyQuoteLink(quote.quote_slug)}
                      style={lightButton}
                    >
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

                        alert("Client quote resent.");
                      }}
                      style={lightButton}
                    >
                      Resend Quote
                    </button>
                                      {quote.deposit_required && !quote.deposit_paid && (
  <button
    onClick={async () => {
      const res = await fetch("/api/send-deposit-reminders", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    quoteSlug: quote.quote_slug,
  }),
});

if (!res.ok) {
  const errorText = await res.text();
  console.error("DEPOSIT REMINDER ERROR:", errorText);
  alert("Deposit reminder failed: " + errorText);
  return;
}

      alert("Deposit reminder sent.");
      loadQuotes(true);
    }}
    style={lightButton}
  >
    Send Deposit Reminder
  </button>
)}

                    {quote.deposit_required && !quote.deposit_paid && (
                      <button
                        onClick={async () => {
                          const now = new Date().toISOString();

                          const { error } = await supabase
                            .from("quotes")
                            .update({
                              deposit_paid: true,
                              deposit_paid_at: now,
                              updated_at: now,
                            })
                            .eq("quote_slug", quote.quote_slug);

                          if (error) {
                            alert("Failed to update.");
                            return;
                          }

                          triggerHighlight(quote.quote_slug, quote.client_name);
                          loadQuotes(true);
                        }}
                        style={accentButton}
                      >
                        Mark Deposit Received
                      </button>
                    )}

                    <button
                      onClick={() => archiveQuote(quote)}
                      style={archiveButton}
                    >
                      Archive Quote
                    </button>
                  </div>
                </div>
              );
})}
          </div>
                )}

        <div style={archivedSection}>
          <button
            onClick={() => setShowArchivedQuotes(!showArchivedQuotes)}
            style={archivedToggleButton}
          >
            {showArchivedQuotes ? "Hide Archived Quotes" : "Show Archived Quotes"}{" "}
            ({archivedQuotes.length})
          </button>

          {showArchivedQuotes && (
            <div style={archivedPanel}>
              <h3 style={{ marginTop: 0, color: "#ff5c00" }}>
                Archived Quotes / Quote History
              </h3>

              {archivedQuotes.length === 0 ? (
                <p style={{ marginBottom: 0, color: "#555" }}>
                  No archived quotes yet.
                </p>
              ) : (
                <div style={grid}>
                  {archivedQuotes.map((quote) => {
                    const quoteUrl = getQuoteUrl(quote.quote_slug);

                    return (
                      <div key={quote.quote_slug} style={archivedCard}>
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
                            <strong>Archived:</strong>{" "}
                            {quote.archived_at
                              ? new Date(quote.archived_at).toLocaleString()
                              : "Archived"}
                          </p>
                        </div>

                        <div style={actions}>
                          <a
                            href={quoteUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={darkButton}
                          >
                            View Quote
                          </a>

                          <button
                            onClick={() => copyQuoteLink(quote.quote_slug)}
                            style={lightButton}
                          >
                            {copiedSlug === quote.quote_slug
                              ? "Copied!"
                              : "Copy Link"}
                          </button>

                          <button
                            onClick={() => restoreQuote(quote)}
                            style={accentButton}
                          >
                            Restore Quote
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
          </AllianceGate>
        
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

const snapshotGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
  marginBottom: 20,
};

const snapshotCard = {
  background: "#181818",
  border: "1px solid rgba(255, 92, 0, 0.28)",
  borderRadius: 14,
  padding: 16,
};

const snapshotLabel = {
  margin: 0,
  color: "#b8b8b8",
  fontSize: 13,
};

const snapshotValue = {
  display: "block",
  marginTop: 8,
  color: "#fff",
  fontSize: 24,
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

const archiveButton = {
  background: "#fff",
  color: "#7f1d1d",
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #fecaca",
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

const depositReminderBox = {
  marginTop: 8,
  marginBottom: 10,
  padding: 12,
  borderRadius: 10,
  background: "#fff7ed",
  border: "1px solid #fed7aa",
};

const depositReminderText = {
  margin: "5px 0 0",
  color: "#444",
  fontSize: 12,
  lineHeight: 1.45,
};

const timelineSmallText = {
  margin: "3px 0 0",
  color: "#666",
  fontSize: 12,
};
const archivedSection = {
  marginTop: 28,
};

const archivedToggleButton = {
  width: "100%",
  background: "#1a1a1a",
  color: "#ff5c00",
  padding: "14px 16px",
  borderRadius: 12,
  border: "1px solid rgba(255, 92, 0, 0.45)",
  cursor: "pointer",
  fontWeight: "bold" as const,
  textAlign: "left" as const,
};

const archivedPanel = {
  marginTop: 14,
  background: "#fff",
  color: "#111",
  padding: 18,
  borderRadius: 14,
  border: "1px solid #e5e5e5",
};

const archivedCard = {
  ...card,
  opacity: 0.88,
  border: "1px solid #ddd",
};
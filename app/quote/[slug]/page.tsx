"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabase";

type Quote = {
  quote_slug: string;
  shop_name: string;
  artist_name: string | null;
  client_name: string;
  tattoo_description: string;
  pricing_mode: string;
  hours: number | null;
  total: number;
  discount: number | null;
  deposit_required: boolean | null;
  deposit_percent: number | null;
  deposit_amount: number | null;
  deposit_due_hours: number | null;
  payment_instructions: string | null;
  booking_link: string | null;
  booking_instructions: string | null;
  deposit_paid: boolean | null;
  deposit_paid_at: string | null;
  status: string | null;
  accepted_at: string | null;
  booked_at: string | null;
};

export default function CustomerQuotePage() {
  const params = useParams();
  const slug = params.slug as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [markingBooked, setMarkingBooked] = useState(false);
  const [markingDepositPaid, setMarkingDepositPaid] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadQuote() {
      const { data, error } = await supabase
        .from("quotes")
        .select("*")
        .eq("quote_slug", slug)
        .single();

      if (error) {
        console.error("QUOTE LOAD ERROR:", error);
        setQuote(null);
      } else {
        setQuote(data);
      }

      setLoading(false);
    }

    if (slug) {
      loadQuote();

      const interval = setInterval(() => {
        loadQuote();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [slug]);

  function scrollToSection(id: string) {
    const section = document.getElementById(id);
    if (!section) return;

    const yOffset = -20;
    const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({ top: y, behavior: "smooth" });
  }

  async function copyQuoteLink() {
    const link = window.location.href;
    await navigator.clipboard.writeText(link);
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  }

  async function acceptQuote() {
    if (!quote) return;

    setAccepting(true);

    try {
      const response = await fetch("/api/accept-quote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ slug: quote.quote_slug }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("ACCEPT FAILED:", data);
        alert("Could not accept quote. Please contact the shop.");
        setAccepting(false);
        return;
      }

      setQuote({
        ...quote,
        status: "accepted",
        accepted_at: data.quote?.accepted_at || new Date().toISOString(),
      });

      alert("Quote accepted.");
    } catch (error) {
      console.error("ACCEPT QUOTE BUTTON ERROR:", error);
      alert("Could not accept quote. Please contact the shop.");
    }

    setAccepting(false);
  }

  async function markBooked() {
    if (!quote) return;

    setMarkingBooked(true);

    const now = new Date().toISOString();

    const { error } = await supabase
      .from("quotes")
      .update({
        status: "booked",
        booked_at: now,
      })
      .eq("quote_slug", quote.quote_slug);

    if (error) {
      console.error("BOOK ERROR:", error);
      alert("Could not mark as booked.");
      setMarkingBooked(false);
      return;
    }

    setQuote({
      ...quote,
      status: "booked",
      booked_at: now,
    });

    alert("Perfect — your appointment booking has been noted.");
    setMarkingBooked(false);
  }

  async function confirmDepositSent() {
    if (!quote) return;

    setMarkingDepositPaid(true);

    const response = await fetch("/api/confirm-deposit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ slug: quote.quote_slug }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("DEPOSIT CONFIRMATION FAILED:", data);
      alert("Could not confirm deposit.");
      setMarkingDepositPaid(false);
      return;
    }

    setQuote({
      ...quote,
      deposit_paid: true,
      deposit_paid_at: new Date().toISOString(),
    });

    alert("Deposit marked as sent. The shop has been notified.");
    setMarkingDepositPaid(false);
  }

  function getSafeBookingLink(link: string) {
    if (link.startsWith("http")) return link;
    return `https://${link}`;
  }

  function getDeadlineDate(acceptedAt?: string | null, dueHours?: number | null) {
    if (!acceptedAt) return null;

    const accepted = new Date(acceptedAt).getTime();
    const deadline = accepted + Number(dueHours || 24) * 60 * 60 * 1000;

    return new Date(deadline);
  }

  function getTimeRemaining(acceptedAt?: string | null, dueHours?: number | null) {
    const deadline = getDeadlineDate(acceptedAt, dueHours);
    if (!deadline) return null;

    const diff = deadline.getTime() - Date.now();

    if (diff <= 0) return "expired";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    return `${hours}h ${minutes}m remaining`;
  }

  function formatDateTime(date?: string | null) {
    if (!date) return "Not completed yet";

    return new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1>Loading client quote...</h1>
        </div>
      </div>
    );
  }

  if (!quote) {
    return (
      <div style={pageStyle}>
        <div style={cardStyle}>
          <h1>Quote Not Found</h1>
        </div>
      </div>
    );
  }

  const isAccepted =
    quote.status === "accepted" ||
    quote.status === "booked" ||
    Boolean(quote.accepted_at) ||
    Boolean(quote.booked_at);

  const isBooked = quote.status === "booked" || Boolean(quote.booked_at);

  const timeRemaining = getTimeRemaining(
    quote.accepted_at,
    quote.deposit_due_hours
  );

  const deadlineDate = getDeadlineDate(
    quote.accepted_at,
    quote.deposit_due_hours
  );

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={topButtonBarStyle}>
          <button
            onClick={() => scrollToSection("quote-details")}
            style={topNavButtonStyle}
          >
            Quote
          </button>

          <button
            onClick={() => scrollToSection("deposit-section")}
            style={topNavButtonStyle}
          >
            Deposit
          </button>

          <button
            onClick={() => scrollToSection("timeline-section")}
            style={topNavButtonStyle}
          >
            Timeline
          </button>

          <button onClick={copyQuoteLink} style={topNavButtonStyle}>
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>

        {copied && <p style={copiedTextStyle}>Quote link copied.</p>}

        <div id="quote-details" style={{ paddingTop: 20 }}>
          <h1 style={{ color: "#ff5c00" }}>Client Quote</h1>

          <p style={{ marginTop: -6 }}>
            Prepared by <strong>{quote.artist_name || quote.shop_name}</strong>
          </p>

          <h2 style={{ color: "#ff5c00" }}>
            Total Estimate: ${Number(quote.total).toFixed(0)}
          </h2>

          <div style={quoteDetailsBoxStyle}>
            <p>
              <strong>Client:</strong> {quote.client_name}
            </p>

            <p>
              <strong>Service Description:</strong>
              <br />
              {quote.tattoo_description}
            </p>

            <p>
              <strong>Pricing Type:</strong>{" "}
              {quote.pricing_mode === "piece" ? "By Piece" : "Hourly"}
            </p>

            {quote.pricing_mode !== "piece" && quote.hours && (
              <p>
                <strong>Estimated Hours:</strong> {quote.hours}
              </p>
            )}

            {quote.discount && quote.discount > 0 && (
              <p>
                <strong>Discount Applied:</strong> $
                {Number(quote.discount).toFixed(0)}
              </p>
            )}
          </div>
        </div>

        <div id="deposit-section" style={{ paddingTop: 20 }}>
          {quote.deposit_required ? (
            <div style={depositBoxStyle}>
              <h3 style={{ color: "#ff5c00", marginTop: 0 }}>
                Deposit Required
              </h3>

              <p>
                <strong>Deposit:</strong> $
                {Number(quote.deposit_amount || 0).toFixed(0)}
              </p>

              <p>
                <strong>Deposit Deadline:</strong> Deposit must be received
                within {quote.deposit_due_hours || 24} hours after accepting
                this quote.
              </p>

              {quote.payment_instructions && (
                <p>
                  <strong>Payment Instructions:</strong>
                  <br />
                  {quote.payment_instructions}
                </p>
              )}

              {isAccepted &&
                !quote.deposit_paid &&
                timeRemaining !== "expired" && (
                  <p style={{ color: "#ff5c00", fontWeight: "bold" }}>
                    ⏳ {timeRemaining}
                  </p>
                )}

              {isAccepted &&
                !quote.deposit_paid &&
                timeRemaining === "expired" && (
                  <p style={{ color: "red", fontWeight: "bold" }}>
                    Deposit window has expired. Please contact the artist to
                    continue.
                  </p>
                )}

              {quote.deposit_paid && (
                <p style={{ color: "green", fontWeight: "bold" }}>
                  Deposit marked as sent.
                </p>
              )}
            </div>
          ) : (
            <div style={bookingInstructionsStyle}>
              <h3 style={{ color: "#ff5c00", marginTop: 0 }}>Deposit</h3>
              <p style={{ marginBottom: 0 }}>
                No deposit is required for this quote.
              </p>
            </div>
          )}
        </div>

        <div
          id="timeline-section"
          style={{ ...timelineBoxStyle, paddingTop: 20 }}
        >
          <h3 style={{ color: "#ff5c00", marginTop: 0 }}>Appointment Timeline</h3>

          <div style={timelineItemStyle}>
            <div style={timelineDotDoneStyle}></div>
            <div>
              <strong>Quote Created</strong>
              <p style={timelineTextStyle}>
                Client quote has been delivered.
              </p>
            </div>
          </div>

          <div style={timelineItemStyle}>
            <div
              style={isAccepted ? timelineDotDoneStyle : timelineDotPendingStyle}
            ></div>
            <div>
              <strong>Quote Accepted</strong>
              <p style={timelineTextStyle}>
                {isAccepted
                  ? formatDateTime(quote.accepted_at)
                  : "Waiting for client to accept the quote."}
              </p>
            </div>
          </div>

          {quote.deposit_required && (
            <div style={timelineItemStyle}>
              <div
                style={
                  quote.deposit_paid
                    ? timelineDotDoneStyle
                    : timelineDotPendingStyle
                }
              ></div>
              <div>
                <strong>Deposit Sent</strong>
                <p style={timelineTextStyle}>
                  {quote.deposit_paid
                    ? formatDateTime(quote.deposit_paid_at)
                    : isAccepted
                    ? timeRemaining === "expired"
                      ? "Deposit window has expired."
                      : `Due by ${
                          deadlineDate
                            ? formatDateTime(deadlineDate.toISOString())
                            : "deadline"
                        }`
                    : "Deposit countdown starts after quote is accepted."}
                </p>
              </div>
            </div>
          )}

          <div style={timelineItemStyle}>
            <div
              style={isBooked ? timelineDotDoneStyle : timelineDotPendingStyle}
            ></div>
            <div>
              <strong>Appointment Booked</strong>
              <p style={timelineTextStyle}>
                {isBooked
                  ? formatDateTime(quote.booked_at)
                  : "Waiting for appointment booking confirmation."}
              </p>
            </div>
          </div>
        </div>

        {quote.booking_instructions && isAccepted && (
          <div style={bookingInstructionsStyle}>
            <h3 style={{ color: "#ff5c00", marginTop: 0 }}>How to Book</h3>
            <p style={{ marginBottom: 0 }}>{quote.booking_instructions}</p>
          </div>
        )}

        {!isAccepted && (
          <button
            onClick={acceptQuote}
            disabled={accepting}
            style={primaryButtonStyle}
          >
            {accepting ? "Accepting Quote..." : "Accept Quote"}
          </button>
        )}

        {isAccepted && (
          <div style={acceptedBoxStyle}>
            <h3 style={{ color: "green", marginTop: 0 }}>
              {isBooked ? "Appointment Booking Noted" : "Quote Accepted"}
            </h3>

            {quote.deposit_required &&
              !quote.deposit_paid &&
              timeRemaining !== "expired" && (
                <button
                  onClick={confirmDepositSent}
                  disabled={markingDepositPaid}
                  style={depositButtonStyle}
                >
                  {markingDepositPaid ? "Saving..." : "I Sent My Deposit"}
                </button>
              )}

            {quote.booking_link && !isBooked && (
              <a
                href={getSafeBookingLink(quote.booking_link)}
                target="_blank"
                rel="noreferrer"
                style={bookingButtonStyle}
              >
                Book Appointment
              </a>
            )}

            {!isBooked && (
              <button
                onClick={markBooked}
                disabled={markingBooked}
                style={secondaryButtonStyle}
              >
                {markingBooked ? "Saving..." : "I Booked My Appointment"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

const pageStyle = {
  background: "#0f0f0f",
  minHeight: "100vh",
  padding: 24,
  fontFamily: "Arial, sans-serif",
};

const cardStyle = {
  maxWidth: 720,
  margin: "0 auto",
  background: "#fff",
  color: "#111",
  padding: 28,
  borderRadius: 18,
};

const topButtonBarStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(4, 1fr)",
  gap: 8,
  marginBottom: 14,
};

const topNavButtonStyle = {
  padding: "10px",
  background: "#111",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold" as const,
  cursor: "pointer",
  fontSize: 13,
};

const copiedTextStyle = {
  background: "#f6fff6",
  color: "green",
  border: "1px solid #b7e4b7",
  padding: 10,
  borderRadius: 10,
  fontWeight: "bold" as const,
};

const quoteDetailsBoxStyle = {
  background: "#f7f7f7",
  border: "1px solid #e5e5e5",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
};

const depositBoxStyle = {
  background: "#fff8f1",
  border: "1px solid #ffd2a6",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
};

const bookingInstructionsStyle = {
  background: "#f7f7f7",
  border: "1px solid #e5e5e5",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
};

const timelineBoxStyle = {
  background: "#111",
  color: "#fff",
  border: "1px solid #333",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
};

const timelineItemStyle = {
  display: "flex",
  gap: 12,
  alignItems: "flex-start",
  marginBottom: 14,
};

const timelineDotDoneStyle = {
  width: 14,
  height: 14,
  minWidth: 14,
  borderRadius: "50%",
  background: "#ff5c00",
  marginTop: 3,
};

const timelineDotPendingStyle = {
  width: 14,
  height: 14,
  minWidth: 14,
  borderRadius: "50%",
  background: "#555",
  marginTop: 3,
};

const timelineTextStyle = {
  margin: "4px 0 0",
  color: "#d7d7d7",
  fontSize: 14,
};

const acceptedBoxStyle = {
  background: "#f6fff6",
  border: "1px solid #b7e4b7",
  padding: 16,
  borderRadius: 12,
  marginTop: 16,
};

const primaryButtonStyle = {
  width: "100%",
  padding: "14px",
  background: "#ff5c00",
  color: "#fff",
  border: "none",
  borderRadius: 10,
  fontWeight: "bold" as const,
  marginTop: 18,
  cursor: "pointer",
};

const secondaryButtonStyle = {
  width: "100%",
  padding: "14px",
  background: "#f2f2f2",
  color: "#111",
  border: "1px solid #ccc",
  borderRadius: 10,
  fontWeight: "bold" as const,
  marginTop: 10,
  cursor: "pointer",
};

const bookingButtonStyle = {
  display: "block",
  textAlign: "center" as const,
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px",
  background: "#111",
  color: "#fff",
  borderRadius: 10,
  fontWeight: "bold" as const,
  textDecoration: "none",
  marginTop: 10,
};

const depositButtonStyle = {
  width: "100%",
  padding: "14px",
  background: "#fff8f1",
  color: "#ff5c00",
  border: "1px solid #ff5c00",
  borderRadius: 10,
  fontWeight: "bold" as const,
  marginTop: 10,
  cursor: "pointer",
};
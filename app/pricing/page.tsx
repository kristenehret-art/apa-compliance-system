"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export default function PricingPage() {
  const supabase = createClient();  
  const [profileId, setProfileId] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [membershipTier, setMembershipTier] = useState("free");

useEffect(() => {
  async function loadUser() {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setProfileId(session.user.id);
      setEmail(session.user.email || null);

      const { data: profile } = await supabase
        .from("profiles")
        .select("membership_tier")
        .eq("id", session.user.id)
        .single();

      setMembershipTier(
        profile?.membership_tier || "free"
      );
    }
  }

  loadUser();

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(
    async (_event, session) => {
      if (session?.user) {
        setProfileId(session.user.id);
        setEmail(session.user.email || null);

        const { data: profile } = await supabase
          .from("profiles")
          .select("membership_tier")
          .eq("id", session.user.id)
          .single();

        setMembershipTier(
          profile?.membership_tier || "free"
        );
      } else {
        setProfileId(null);
        setEmail(null);
        setMembershipTier("free");
      }
    }
  );

  return () => {
    subscription.unsubscribe();
  };
}, []);

  async function handleAllianceCheckout() {
    if (!profileId) {
      alert("Please log into your APA account first.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          profileId,
          email,
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not start Stripe checkout.");
      }
    } catch (error) {
      console.error("CHECKOUT BUTTON ERROR:", error);

      alert("Something went wrong starting checkout.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={pageStyle}>
      <section style={heroStyle}>
        <img
          src="/apa-logo.png"
          alt="Artist Protection Alliance"
          style={logoStyle}
        />

        <p style={eyebrowStyle}>APA Membership</p>

        <h1 style={titleStyle}>Choose your membership.</h1>

        <p style={subtextStyle}>
          Start free with APA tools, then upgrade to Alliance Member when you’re
          ready to unlock professional quote workflows, dashboard tools,
          compliance support, opportunity posting, and future member-only perks.
        </p>
      </section>

      <section style={pricingGridStyle}>
        <div style={cardStyle}>
          <p style={tierLabelStyle}>Free Member</p>

          <h2 style={priceStyle}>$0</h2>

          <p style={priceSubtextStyle}>Start using APA tools</p>

          <ul style={listStyle}>
            <li>✔ Tattoo pricing calculator access</li>
            <li>✔ Browse hiring hub opportunities</li>
            <li>✔ Basic member account</li>
            <li>✔ APA launch updates</li>
            <li>✔ Upgrade anytime</li>
          </ul>

          {!profileId ? (
  <Link href="/signup" style={secondaryButtonStyle}>
    Create Free Account
  </Link>
) : membershipTier === "alliance" ||
  membershipTier === "admin" ? (
  <Link href="/account" style={secondaryButtonStyle}>
    View Account
  </Link>
) : (
  <Link
    href="/account"
    style={{
      ...secondaryButtonStyle,
      width: "90%",
      display: "flex",
      justifyContent: "center",
    }}
  >
    Manage Free Account
  </Link>
)}
        </div>

        <div style={featuredCardStyle}>
          <div style={badgeStyle}>Founding Rate</div>

          <p style={tierLabelStyle}>Alliance Member</p>

          <h2 style={priceStyle}>$9/mo</h2>

          <p style={priceSubtextStyle}>Locked-in launch pricing</p>

          <ul style={listStyle}>
            <li>✔ Professional client quote system</li>
            <li>✔ Client-ready quote links</li>
            <li>✔ Deposit tracking workflow</li>
            <li>✔ Artist dashboard tools</li>
            <li>✔ Compliance reminders</li>
            <li>✔ Document vault access</li>
            <li>✔ Post hiring hub opportunities</li>
            <li>✔ Future voluntary benefits access</li>
            <li>✔ Future vendor and partner perks</li>
          </ul>

          <button
            onClick={handleAllianceCheckout}
            style={primaryButtonStyle}
            disabled={loading}
          >
            {loading
              ? "Redirecting To Stripe..."
              : "Join Founding Alliance"}
          </button>

          <p style={tinyTextStyle}>
            Secure checkout powered by Stripe.
          </p>
        </div>
      </section>

      <section style={noteStyle}>
        <h3 style={noteTitleStyle}>Why founding pricing?</h3>

        <p style={noteTextStyle}>
          Early APA members help shape the platform before public launch. The
          founding Alliance rate is designed to stay affordable while APA grows
          into voluntary benefits, vendor partnerships, insurance resources, and
          professional tools built for tattoo artists and shops.
        </p>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background:
    "radial-gradient(circle at top, rgba(255,92,0,0.18), transparent 32%), #050505",
  color: "#ffffff",
  padding: "44px 20px",
};

const heroStyle: React.CSSProperties = {
  maxWidth: "860px",
  margin: "0 auto 34px",
  textAlign: "center",
};

const logoStyle: React.CSSProperties = {
  width: "125px",
  marginBottom: "22px",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#ff5c00",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "12px",
  fontWeight: 900,
};

const titleStyle: React.CSSProperties = {
  fontSize: "clamp(38px, 6vw, 68px)",
  lineHeight: "1",
  margin: "12px 0 18px",
};

const subtextStyle: React.CSSProperties = {
  color: "#cfcfcf",
  fontSize: "18px",
  lineHeight: "1.7",
  maxWidth: "760px",
  margin: "0 auto",
};

const pricingGridStyle: React.CSSProperties = {
  maxWidth: "1100px",
  margin: "0 auto",
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "22px",
};

const cardStyle: React.CSSProperties = {
  background: "rgba(17,17,17,0.96)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "28px",
  padding: "30px",
  boxShadow: "0 24px 70px rgba(0,0,0,0.45)",
};

const featuredCardStyle: React.CSSProperties = {
  ...cardStyle,
  border: "1px solid rgba(255,92,0,0.55)",
  position: "relative",
};

const badgeStyle: React.CSSProperties = {
  position: "absolute",
  top: "20px",
  right: "20px",
  background: "rgba(255,92,0,0.16)",
  color: "#ff5c00",
  border: "1px solid rgba(255,92,0,0.35)",
  borderRadius: "999px",
  padding: "8px 12px",
  fontSize: "12px",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
};

const tierLabelStyle: React.CSSProperties = {
  color: "#ff5c00",
  fontWeight: 900,
  textTransform: "uppercase",
  letterSpacing: "0.1em",
  fontSize: "13px",
};

const priceStyle: React.CSSProperties = {
  fontSize: "48px",
  margin: "10px 0 4px",
};

const priceSubtextStyle: React.CSSProperties = {
  color: "#bdbdbd",
  marginBottom: "24px",
};

const listStyle: React.CSSProperties = {
  display: "grid",
  gap: "13px",
  paddingLeft: "0",
  listStyle: "none",
  color: "#eeeeee",
  lineHeight: "1.5",
  marginBottom: "28px",
};

const primaryButtonStyle: React.CSSProperties = {
  width: "100%",
  border: "none",
  cursor: "pointer",
  display: "block",
  textAlign: "center",
  background: "#ff5c00",
  color: "#ffffff",
  padding: "15px 18px",
  borderRadius: "999px",
  textDecoration: "none",
  fontWeight: 900,
  fontSize: "16px",
};

const secondaryButtonStyle: React.CSSProperties = {
  ...primaryButtonStyle,
  background: "transparent",
  border: "1px solid rgba(255,92,0,0.6)",
  color: "#ff5c00",
};

const tinyTextStyle: React.CSSProperties = {
  color: "#a9a9a9",
  fontSize: "13px",
  lineHeight: "1.6",
  marginTop: "14px",
  textAlign: "center",
};

const noteStyle: React.CSSProperties = {
  maxWidth: "900px",
  margin: "28px auto 0",
  background: "rgba(255,92,0,0.08)",
  border: "1px solid rgba(255,92,0,0.22)",
  borderRadius: "24px",
  padding: "24px",
};

const noteTitleStyle: React.CSSProperties = {
  margin: "0 0 8px",
};

const noteTextStyle: React.CSSProperties = {
  color: "#d6d6d6",
  lineHeight: "1.7",
  margin: 0,
};
import { getMembership } from "../../lib/getMembership";

export default async function MemberStatusPage() {
  const membership = await getMembership();

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <img
          src="/apa-logo.png"
          alt="Artist Protection Alliance"
          style={logoStyle}
        />

        <p style={eyebrowStyle}>APA Membership Status</p>

        <h1 style={titleStyle}>
          {membership.isLoggedIn ? "Member Detected" : "Not Logged In"}
        </h1>

        <div style={statusBoxStyle}>
          <p>
            <strong>Email:</strong>{" "}
            {membership.user?.email || "Not logged in"}
          </p>

          <p>
            <strong>Artist Name:</strong>{" "}
            {membership.profile?.artist_name || "Not set"}
          </p>

          <p>
            <strong>Shop Name:</strong>{" "}
            {membership.profile?.shop_name || "Not set"}
          </p>

          <p>
            <strong>Membership Tier:</strong>{" "}
            {membership.membershipTier === "alliance"
              ? "Alliance Member"
              : membership.membershipTier === "admin"
              ? "APA Admin"
              : "Free Member"}
          </p>

          <p>
            <strong>Can Access Alliance Features:</strong>{" "}
            {membership.isAlliance ? "Yes" : "No"}
          </p>
        </div>

        <a href="/dashboard" style={buttonStyle}>
          Back to Dashboard
        </a>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px",
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "600px",
  background: "#111111",
  border: "1px solid rgba(255,92,0,0.35)",
  borderRadius: "28px",
  padding: "34px",
  boxShadow: "0 30px 80px rgba(0,0,0,0.55)",
};

const logoStyle: React.CSSProperties = {
  width: "110px",
  display: "block",
  margin: "0 auto 22px",
};

const eyebrowStyle: React.CSSProperties = {
  color: "#ff5c00",
  textTransform: "uppercase",
  letterSpacing: "0.14em",
  fontSize: "12px",
  fontWeight: 800,
  textAlign: "center",
};

const titleStyle: React.CSSProperties = {
  textAlign: "center",
  fontSize: "34px",
  margin: "10px 0 24px",
};

const statusBoxStyle: React.CSSProperties = {
  background: "#080808",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "18px",
  padding: "20px",
  lineHeight: "1.8",
  marginBottom: "24px",
};

const buttonStyle: React.CSSProperties = {
  display: "block",
  textAlign: "center",
  background: "#ff5c00",
  color: "#ffffff",
  padding: "14px 18px",
  borderRadius: "999px",
  fontWeight: 900,
  textDecoration: "none",
};
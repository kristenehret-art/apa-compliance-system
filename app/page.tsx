import Link from "next/link";

export default function Page() {
  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={brandCardStyle}>
          <img
            src="/apa-logo.png"
            alt="Artist Protection Alliance"
            style={logoStyle}
          />

          <h1 style={headlineStyle}>Your business, in one place.</h1>
          <p style={subtitleStyle}>
            Manage quotes, bookings, pricing tools, compliance, and tattoo
            industry opportunities from one professional hub.
          </p>
        </div>

        <Link href="/dashboard" style={linkReset}>
          <div style={{ ...cardStyle, ...heroCard }}>
            <h2 style={heroTitle}>Artist Dashboard</h2>
            <p style={heroText}>Track quotes, bookings & deposits</p>
          </div>
        </Link>

        <div style={gridStyle}>
          <DashboardCard
            href="/opportunities"
            title="Opportunities"
            text="Find guest spots, jobs & apprenticeships"
          />

          <DashboardCard
            href="/compliance"
            title="Compliance"
            text="Stay licensed & industry compliant"
          />

          <DashboardCard
            href="/calculator"
            title="Tattoo Calculator"
            text="Create accurate, professional quotes"
          />

          <DashboardCard
            href="/test"
            title="System Tools"
            text="Diagnostics & internal tools"
            ghost
          />
        </div>

        <p style={footerStyle}>
          © {new Date().getFullYear()} Artist Protection Alliance
        </p>
      </div>
    </div>
  );
}

function DashboardCard({
  href,
  title,
  text,
  ghost,
}: {
  href: string;
  title: string;
  text: string;
  ghost?: boolean;
}) {
  return (
    <Link href={href} style={linkReset}>
      <div style={{ ...cardStyle, ...(ghost ? ghostCard : {}) }}>
        <h3 style={cardTitle}>{title}</h3>
        <p style={cardText}>{text}</p>
      </div>
    </Link>
  );
}

const pageStyle = {
  background:
    "radial-gradient(circle at top, rgba(255,92,0,0.18) 0%, rgba(20,20,20,1) 34%, #050505 100%)",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  padding: 24,
};

const shellStyle = {
  width: "100%",
  maxWidth: 760,
};

const brandCardStyle = {
  textAlign: "center" as const,
  marginBottom: 28,
};

const logoStyle = {
  width: 300,
  margin: "0 auto 18px auto",
  display: "block",
};

const headlineStyle = {
  color: "#fff",
  fontSize: 34,
  marginBottom: 8,
  letterSpacing: -0.5,
};

const subtitleStyle = {
  color: "#a8a8a8",
  fontSize: 15,
  lineHeight: 1.6,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 16,
  marginTop: 16,
};

const linkReset = {
  textDecoration: "none",
  color: "inherit",
};

const cardStyle = {
  background: "linear-gradient(180deg, #1e1e1e, #121212)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: 20,
  padding: 22,
  cursor: "pointer",
  boxShadow: "0 12px 30px rgba(0,0,0,0.45)",
};

const heroCard = {
  marginBottom: 12,
  background: "linear-gradient(135deg, #ff5c00, #ff8a2a)",
  color: "#fff",
  boxShadow: "0 20px 45px rgba(255,92,0,0.35)",
};

const ghostCard = {
  opacity: 0.65,
};

const cardTitle = {
  color: "#fff",
  fontSize: 17,
  marginBottom: 6,
};

const cardText = {
  color: "#cfcfcf",
  fontSize: 13,
};

const heroTitle = {
  color: "#fff",
  fontSize: 20,
  marginBottom: 6,
};

const heroText = {
  color: "#fff",
  fontSize: 14,
  opacity: 0.9,
};

const footerStyle = {
  color: "#666",
  fontSize: 12,
  marginTop: 30,
  textAlign: "center" as const,
};
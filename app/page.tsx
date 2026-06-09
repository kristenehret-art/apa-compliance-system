import Link from "next/link";

export default function Page() {
  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <section style={heroSectionStyle}>
          <div style={brandCardStyle}>
            <img
              src="/apa-logo.png"
              alt="Artist Protection Alliance"
              style={logoStyle}
            />

            <div style={eyebrowStyle}>Membership support for tattoo professionals</div>

            <h1 style={headlineStyle}>
              Supporting tattooers and piercers throughout their careers.
            </h1>

            <p style={subtitleStyle}>
              Artist Protection Alliance helps members protect their business,
              stay organized, understand compliance expectations, price their
              work with confidence, and discover industry opportunities.
            </p>
          </div>
        </section>

        <div style={featureIntroStyle}>
          <p style={sectionLabelStyle}>Member resources</p>
          <h2 style={sectionTitleStyle}>Built for the business side of your career.</h2>
        </div>

        <div style={gridStyle}>
          <DashboardCard
            href="/calculator"
            title="Pricing Guidance"
            text="Build professional quotes with more confidence before moving work into your dashboard."
          />

          <DashboardCard
            href="/dashboard"
            title="Member Workspace"
            text="Track quotes, bookings, deposits, and client activity in one organized place."
          />

          <DashboardCard
            href="/compliance"
            title="Compliance Support"
            text="View requirements, upload records, and keep important renewal dates on your radar."
          />

          <DashboardCard
            href="/opportunities"
            title="Career Opportunities"
            text="Find guest spots, open positions, conventions, and industry opportunities."
          />

          <DashboardCard
            href="/artists"
            title="Open to Work"
            text="Create a professional listing so shops can discover available tattooers and piercers."
          />

          <DashboardCard
            href="/account"
            title="Member Account"
            text="Manage your profile, membership access, and APA member resources."
          />
        </div>

        <div style={missionCardStyle}>
          <p style={missionLabelStyle}>APA Mission</p>
          <p style={missionTextStyle}>
            Tattoo professionals are often expected to manage the business side
            of their careers alone. APA was created to bring structure, support,
            and practical resources to the artists and piercers building their
            futures in this industry.
          </p>
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
}: {
  href: string;
  title: string;
  text: string;
}) {
  return (
    <Link href={href} style={linkReset}>
      <div style={cardStyle}>
        <h3 style={cardTitle}>
  {title} <span style={cardArrowStyle}>→</span>
</h3>
        <p style={cardText}>{text}</p>
      </div>
    </Link>
  );
}
 const cardArrowStyle = {
  color: "#ff5c00",
  marginLeft: 6,
};
const pageStyle = {
  background:
    "radial-gradient(circle at top, rgba(255,92,0,0.22) 0%, rgba(12,12,12,1) 34%, #050505 100%)",
  minHeight: "100vh",
  display: "flex",
  justifyContent: "center",
  padding: 24,
};

const shellStyle = {
  width: "100%",
  maxWidth: 980,
};

const heroSectionStyle = {
  border: "1px solid rgba(255,92,0,0.22)",
  borderRadius: 28,
  padding: "42px 28px",
  background:
    "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.018))",
  boxShadow: "0 28px 80px rgba(0,0,0,0.55)",
  marginBottom: 34,
};

const brandCardStyle = {
  textAlign: "center" as const,
  maxWidth: 760,
  margin: "0 auto",
};

const logoStyle = {
  width: 260,
  margin: "0 auto 22px auto",
  display: "block",
};

const eyebrowStyle = {
  color: "#ff5c00",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  marginBottom: 14,
};

const headlineStyle = {
  color: "#fff",
  fontSize: 42,
  lineHeight: 1.08,
  margin: "0 0 16px 0",
  letterSpacing: -1.2,
};

const subtitleStyle = {
  color: "#c7c7c7",
  fontSize: 16,
  lineHeight: 1.75,
  margin: "0 auto",
  maxWidth: 680,
};
const memberNoteStyle = {
  marginTop: 24,
  color: "#ffb07a",
  fontSize: 14,
  fontWeight: 700,
  letterSpacing: "0.4px",
};

const featureIntroStyle = {
  textAlign: "center" as const,
  marginBottom: 18,
};

const sectionLabelStyle = {
  color: "#ff5c00",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  marginBottom: 8,
};

const sectionTitleStyle = {
  color: "#fff",
  fontSize: 24,
  margin: 0,
  letterSpacing: -0.4,
};

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
};

const linkReset = {
  textDecoration: "none",
  color: "inherit",
};

const cardStyle = {
  minHeight: 122,
  background:
    "linear-gradient(180deg, rgba(34,34,34,0.98), rgba(12,12,12,0.98))",
  border: "1px solid rgba(255,92,0,0.22)",
  borderRadius: 22,
  padding: 24,
  cursor: "pointer",
  boxShadow: "0 16px 38px rgba(0,0,0,0.48)",
  position: "relative" as const,
};

const cardTitle = {
  color: "#fff",
  fontSize: 18,
  margin: "0 0 8px 0",
};

const cardText = {
  color: "#bdbdbd",
  fontSize: 14,
  lineHeight: 1.55,
  margin: 0,
};

const missionCardStyle = {
  marginTop: 22,
  padding: 24,
  borderRadius: 22,
  background: "rgba(255,92,0,0.08)",
  border: "1px solid rgba(255,92,0,0.22)",
};

const missionLabelStyle = {
  color: "#ff5c00",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "2px",
  textTransform: "uppercase" as const,
  margin: "0 0 10px 0",
};

const missionTextStyle = {
  color: "#dedede",
  fontSize: 15,
  lineHeight: 1.7,
  margin: 0,
};

const footerStyle = {
  color: "#666",
  fontSize: 12,
  marginTop: 30,
  textAlign: "center" as const,
};
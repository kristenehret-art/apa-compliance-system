import Link from "next/link";

type AllianceGateProps = {
  allowed: boolean;
  title?: string;
  description?: string;
  children: React.ReactNode;
};

export default function AllianceGate({
  allowed,
  title = "Alliance Member Feature",
 description = "Upgrade to unlock quoting, compliance tracking, opportunity posting, shop management tools, and Alliance member benefits.",
  children,
}: AllianceGateProps) {
  if (allowed) {
    return <>{children}</>;
  }

  return (
    <div style={lockedCardStyle}>
      <div style={lockIconStyle}>🔒</div>

      <h3 style={titleStyle}>{title}</h3>

      <p style={descriptionStyle}>{description}</p>

      <Link href="/pricing" style={buttonStyle}>
        Upgrade to Alliance
      </Link>
    </div>
  );
}

const lockedCardStyle: React.CSSProperties = {
  border: "1px solid rgba(255, 92, 0, 0.35)",
  background:
    "linear-gradient(135deg, rgba(255, 92, 0, 0.12), rgba(10, 10, 10, 0.94))",
  borderRadius: "22px",
  padding: "28px",
  color: "#ffffff",
  boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
};

const lockIconStyle: React.CSSProperties = {
  width: "44px",
  height: "44px",
  borderRadius: "999px",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(255, 92, 0, 0.18)",
  border: "1px solid rgba(255, 92, 0, 0.35)",
  marginBottom: "16px",
  fontSize: "20px",
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "22px",
  letterSpacing: "-0.03em",
};

const descriptionStyle: React.CSSProperties = {
  marginTop: "10px",
  marginBottom: "22px",
  color: "#d6d6d6",
  lineHeight: 1.6,
  maxWidth: "560px",
};

const buttonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "12px 18px",
  borderRadius: "999px",
  background: "#ff5c00",
  color: "#111111",
  textDecoration: "none",
  fontWeight: 800,
};
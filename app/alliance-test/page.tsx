import { getMembership } from "../../lib/getMembership";
import AllianceLock from "../../components/AllianceLock";

export default async function AllianceTestPage() {
  const membership = await getMembership();

  if (!membership.isAlliance) {
    return (
      <main style={pageStyle}>
        <AllianceLock
          title="Alliance Member Access Required"
          description="Quote generation, advanced dashboard tools, compliance vault access, and posting privileges are reserved for Alliance Members."
        />
      </main>
    );
  }

  return (
    <main style={pageStyle}>
      <section style={cardStyle}>
        <h1>Alliance Member Feature Unlocked</h1>
        <p>You are seeing this because your account is Alliance or Admin.</p>
      </section>
    </main>
  );
}

const pageStyle: React.CSSProperties = {
  minHeight: "100vh",
  background: "#050505",
  color: "#ffffff",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: "32px",
};

const cardStyle: React.CSSProperties = {
  background: "#111111",
  border: "1px solid rgba(255,92,0,0.35)",
  borderRadius: "24px",
  padding: "32px",
};
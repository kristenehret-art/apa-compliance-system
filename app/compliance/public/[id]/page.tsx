import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PublicRecord = {
  id: string | number;
  user_id?: string | null;
  artist_name?: string | null;
  shop_name?: string | null;
  name?: string | null;
  title?: string | null;
  city?: string | null;
  state?: string | null;
  location_city?: string | null;
  location_state?: string | null;
  compliance_status_visible?: boolean | null;
  updated_at?: string | null;
  created_at?: string | null;
};

type SharedComplianceItem = {
  id: number;
  completed_date?: string | null;
  expires_date?: string | null;
  document_name?: string | null;
  document_uploaded_at?: string | null;
  is_inapplicable?: boolean | null;
  compliance_items?: {
    name?: string | null;
    category?: string | null;
  } | null;
};

function getStatus(expiresDate?: string | null) {
  if (!expiresDate) return "Current";

  const today = new Date();
  const expires = new Date(expiresDate);

  if (expires < today) return "Expired";

  return "Current";
}

function formatDate(date?: string | null) {
  if (!date) return "Not listed";
  return new Date(date).toLocaleDateString();
}

export default async function PublicCompliancePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: Promise<{ from?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const from = resolvedSearchParams?.from;
  const supabase = await createClient();

  let record: PublicRecord | null = null;
  let recordType = "member";

  const { data: artistProfile } = await supabase
    .from("artist_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (artistProfile) {
    record = artistProfile;
    recordType = "artist";
  }

  if (!record) {
    const { data: opportunity } = await supabase
      .from("opportunities")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (opportunity) {
      record = opportunity;
      recordType = "opportunity";
    }
  }

  if (!record || record.compliance_status_visible !== true) {
    notFound();
  }

  const displayName =
    record.artist_name ||
    record.shop_name ||
    record.name ||
    record.title ||
    "APA Member";

  const city = record.city || record.location_city || "";
  const state = record.state || record.location_state || "";
  const location =
    city && state ? `${city}, ${state}` : city || state || "Location not provided";

  const authUserId = record.user_id;

  let complianceItems: SharedComplianceItem[] = [];

  if (authUserId) {
    const { data } = await supabase
      .from("user_compliance_items")
      .select(
        `
        id,
        completed_date,
        expires_date,
        document_name,
        document_uploaded_at,
        is_inapplicable,
        compliance_items (
          name,
          category
        )
      `
      )
      .eq("auth_user_id", authUserId);

    complianceItems = (data || []) as SharedComplianceItem[];
  }

  const visibleItems = complianceItems.filter(
    (item) =>
      !item.is_inapplicable &&
      (item.completed_date || item.expires_date || item.document_name)
  );

  const currentItems = visibleItems
    .filter((item) => getStatus(item.expires_date) === "Current")
    .sort((a, b) =>
      (a.compliance_items?.name || "").localeCompare(
        b.compliance_items?.name || ""
      )
    );

  const expiredItems = visibleItems
    .filter((item) => getStatus(item.expires_date) === "Expired")
    .sort((a, b) =>
      (a.compliance_items?.name || "").localeCompare(
        b.compliance_items?.name || ""
      )
    );

  const lastUpdatedDates = visibleItems
    .map((item) => item.document_uploaded_at || item.completed_date || item.expires_date)
    .filter(Boolean) as string[];

  const lastUpdated =
    lastUpdatedDates.length > 0
      ? new Date(
          Math.max(...lastUpdatedDates.map((date) => new Date(date).getTime()))
        ).toLocaleDateString()
      : record.updated_at
      ? new Date(record.updated_at).toLocaleDateString()
      : record.created_at
      ? new Date(record.created_at).toLocaleDateString()
      : "Not available";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(255,92,0,0.16), transparent 34%), #080808",
        color: "#f5f5f5",
        padding: "48px 20px",
      }}
    >
      <section
        style={{
          maxWidth: "900px",
          margin: "0 auto",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px",
          background: "rgba(18,18,18,0.92)",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            padding: "28px",
            borderBottom: "1px solid rgba(255,255,255,0.1)",
            background:
              "linear-gradient(135deg, rgba(255,92,0,0.2), rgba(255,255,255,0.03))",
          }}
        >
          <p
            style={{
              margin: "0 0 10px",
              color: "#ff8a3d",
              fontSize: "13px",
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Public APA Compliance Summary
          </p>

          <h1 style={{ margin: 0, fontSize: "34px", lineHeight: 1.1 }}>
            {displayName}
          </h1>

          <p
            style={{
              margin: "12px 0 0",
              color: "rgba(255,255,255,0.72)",
              fontSize: "16px",
            }}
          >
            {location}
          </p>
        </div>

        <div style={{ padding: "28px" }}>
          <div
            style={{
              border: "1px solid rgba(255,92,0,0.35)",
              background: "rgba(255,92,0,0.08)",
              borderRadius: "18px",
              padding: "18px",
              marginBottom: "22px",
            }}
          >
            <p style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
              This {recordType} has chosen to share their APA compliance status.
            </p>

            <p
              style={{
                margin: "10px 0 0",
                color: "rgba(255,255,255,0.72)",
                lineHeight: 1.6,
              }}
            >
              Current and expired compliance items are shown below. Uploaded
              documents, storage files, private notes, and downloads are not
              publicly shared.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gap: "14px",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              marginBottom: "24px",
            }}
          >
            <SummaryBox label="Current Items" value={String(currentItems.length)} />
            <SummaryBox label="Expired Items" value={String(expiredItems.length)} />
            <SummaryBox label="Last Updated" value={lastUpdated} />
          </div>

          <ComplianceSection
            title="Current Compliance"
            emptyText="No current compliance records are currently shared."
            items={currentItems}
            statusColor="#4ade80"
          />

          <ComplianceSection
            title="Expired / Needs Attention"
            emptyText="No expired shared compliance records."
            items={expiredItems}
            statusColor="#ff6b6b"
          />

          <div
            style={{
              borderTop: "1px solid rgba(255,255,255,0.1)",
              paddingTop: "20px",
              marginTop: "24px",
            }}
          >
            <p
              style={{
                margin: 0,
                color: "rgba(255,255,255,0.62)",
                fontSize: "14px",
                lineHeight: 1.7,
              }}
            >
              APA helps organize compliance records and reminders. APA does not
              certify legal compliance or replace local, state, or federal
              requirements.
            </p>
          </div>

          <div style={{ marginTop: "26px" }}>
  <Link
    href={from === "opportunities" ? "/opportunities" : "/artists"}
    style={{
      color: "#ff8a3d",
      textDecoration: "none",
      fontWeight: 700,
    }}
  >
    {from === "opportunities"
      ? "← Back to Opportunities"
      : "← Back to Open to Work"}
  </Link>
</div>
        </div>
      </section>
    </main>
  );
}

function SummaryBox({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "16px",
        padding: "16px",
        background: "rgba(255,255,255,0.04)",
      }}
    >
      <p style={{ margin: 0, color: "#ff8a3d", fontWeight: 700 }}>{label}</p>
      <p style={{ margin: "8px 0 0", color: "#ffffff", fontWeight: 800 }}>
        {value}
      </p>
    </div>
  );
}

function ComplianceSection({
  title,
  emptyText,
  items,
  statusColor,
}: {
  title: string;
  emptyText: string;
  items: SharedComplianceItem[];
  statusColor: string;
}) {
  return (
    <section
      style={{
        marginTop: "22px",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: "18px",
        padding: "18px",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      <h2 style={{ margin: "0 0 14px", fontSize: "22px" }}>{title}</h2>

      {items.length === 0 ? (
        <p style={{ margin: 0, color: "rgba(255,255,255,0.6)" }}>
          {emptyText}
        </p>
      ) : (
        <div style={{ display: "grid", gap: "10px" }}>
          {items.map((item) => (
            <div
              key={item.id}
              style={{
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px",
                padding: "14px",
                background: "#0d0d0d",
                display: "flex",
                justifyContent: "space-between",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <strong style={{ color: "#ffffff" }}>
                  {item.compliance_items?.name || "Compliance record"}
                </strong>

                {item.compliance_items?.category && (
                  <p
                    style={{
                      margin: "5px 0 0",
                      color: "rgba(255,255,255,0.52)",
                      fontSize: "13px",
                    }}
                  >
                    {item.compliance_items.category}
                  </p>
                )}
              </div>

              <div style={{ textAlign: "right" }}>
                <span
                  style={{
                    color: statusColor,
                    fontWeight: 800,
                    fontSize: "13px",
                  }}
                >
                  {getStatus(item.expires_date)}
                </span>

                <p
                  style={{
                    margin: "5px 0 0",
                    color: "rgba(255,255,255,0.62)",
                    fontSize: "13px",
                  }}
                >
                  Expires: {formatDate(item.expires_date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";

type ComplianceItem = {
  id: number;
  name: string;
  category: string;
  default_expiry_months: number;
  state?: string | null;
  county?: string | null;
  applies_to?: string | null;
  description?: string | null;
  source_url?: string | null;
  required?: boolean | null;
  requirement_owner?: "artist" | "shop" | "both" | string | null;
};

type UserComplianceRecord = {
  id: number;
  user_id: number;
  compliance_item_id: number;
  location_state: string;
  location_county: string;
  completed_date: string | null;
  expires_date: string | null;
  next_reminder_date: string | null;
  reminder_enabled: boolean;
  last_reminder_days: number | null;
  status: string;
  document_url?: string | null;
  document_name?: string | null;
  document_uploaded_at?: string | null;
  compliance_items?: {
    name: string;
    category: string;
    default_expiry_months: number;
    description?: string | null;
    source_url?: string | null;
    required?: boolean | null;
    verification_status?: string | null;
    jurisdiction_level?: string | null;
    last_verified?: string | null;
    action_url?: string | null;
    action_label?: string | null;
    requirement_owner?: "artist" | "shop" | "both" | string | null;
    active?: boolean | null;
  } | null;
};

type StateOption = {
  value: string;
  label: string;
};

type ViewMode = "artist" | "shop" | "both";

const stateNameMap: Record<string, string> = {
  AZ: "Arizona",
  Arizona: "Arizona",
  CA: "California",
  California: "California",
  CO: "Colorado",
  Colorado: "Colorado",
  DC: "District of Columbia",
  FL: "Florida",
  Florida: "Florida",
  GA: "Georgia",
  Georgia: "Georgia",
  IL: "Illinois",
  Illinois: "Illinois",
  MA: "Massachusetts",
  Massachusetts: "Massachusetts",
  MI: "Michigan",
  Michigan: "Michigan",
  NC: "North Carolina",
  "North Carolina": "North Carolina",
  NJ: "New Jersey",
  "New Jersey": "New Jersey",
  NV: "Nevada",
  Nevada: "Nevada",
  NY: "New York",
  "New York": "New York",
  OH: "Ohio",
  OR: "Oregon",
  Oregon: "Oregon",
  PA: "Pennsylvania",
  Pennsylvania: "Pennsylvania",
  TN: "Tennessee",
  TX: "Texas",
  Texas: "Texas",
  VA: "Virginia",
  WA: "Washington",
  Washington: "Washington",
};

function formatStateLabel(stateCode: string) {
  return stateNameMap[stateCode] || stateCode;
}

export default function ComplianceDashboard() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [records, setRecords] = useState<UserComplianceRecord[]>([]);
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<string[]>([]);
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [message, setMessage] = useState("");
  const [locationsReady, setLocationsReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("artist");
  const [completionDates, setCompletionDates] = useState<Record<number, string>>(
    {}
  );

  const userId = 1;

  useEffect(() => {
    loadLocationOptions();
  }, []);

  useEffect(() => {
    if (!locationsReady || !state) return;
    autoPopulate();
  }, [locationsReady, state, county]);

  async function loadLocationOptions() {
    setMessage("Loading locations...");

    const { data, error } = await supabase
      .from("compliance_items")
      .select("state")
      .eq("active", true)
      .not("state", "is", null)
      .order("state");

    if (error) {
      setMessage(error.message);
      return;
    }

    const uniqueStates = Array.from(
      new Set((data || []).map((row) => row.state).filter(Boolean))
    ) as string[];

    const formattedStates = uniqueStates.map((s) => ({
      value: s,
      label: formatStateLabel(s),
    }));

    setStateOptions(formattedStates);

    const defaultState =
      uniqueStates.includes("AZ") ? "AZ" : uniqueStates[0] || "";

    if (!defaultState) {
      setMessage("No active compliance locations found.");
      return;
    }

    const counties = await loadCountiesForState(defaultState);

    setState(defaultState);
    setCounty(counties[0] || "");
    setLocationsReady(true);
    setMessage("");
  }

  async function loadCountiesForState(selectedState: string) {
    const { data, error } = await supabase
      .from("compliance_items")
      .select("county")
      .eq("active", true)
      .eq("state", selectedState)
      .not("county", "is", null)
      .order("county");

    if (error) {
      setMessage(error.message);
      return [];
    }

    const uniqueCounties = Array.from(
      new Set((data || []).map((row) => row.county).filter(Boolean))
    ) as string[];

    setCountyOptions(uniqueCounties);
    return uniqueCounties;
  }

  async function loadData() {
    if (!state) return;

    const locationFilter = county
      ? `applies_to.eq.national,and(state.eq.${state},county.is.null),and(state.eq.${state},county.eq.${county})`
      : `applies_to.eq.national,and(state.eq.${state},county.is.null)`;

    const { data: complianceItems, error: itemsError } = await supabase
      .from("compliance_items")
      .select("*")
      .eq("active", true)
      .or(locationFilter)
      .order("name");

    if (itemsError) {
      setMessage(itemsError.message);
      return;
    }

    let recordsQuery = supabase
      .from("user_compliance_items")
      .select(`
        *,
        compliance_items (
          name,
          category,
          default_expiry_months,
          description,
          source_url,
          required,
          verification_status,
          jurisdiction_level,
          last_verified,
          action_url,
          action_label,
          requirement_owner,
          active
        )
      `)
      .eq("user_id", userId)
      .eq("location_state", state)
      .order("expires_date", { ascending: true, nullsFirst: true });

    if (county) {
      recordsQuery = recordsQuery.eq("location_county", county);
    }

    const { data: userRecords, error: recordsError } = await recordsQuery;

    if (recordsError) {
      setMessage(recordsError.message);
      return;
    }

    setItems((complianceItems as ComplianceItem[]) || []);
    setRecords((userRecords as UserComplianceRecord[]) || []);
  }

  async function autoPopulate() {
    setMessage("Loading required compliance...");

    const { error } = await supabase.rpc("auto_populate_user_compliance", {
      p_user_id: userId,
      p_state: state,
      p_county: county,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Required compliance items loaded.");
    loadData();
  }

  async function toggleReminder(record: UserComplianceRecord) {
    setMessage("");

    const { error } = await supabase
      .from("user_compliance_items")
      .update({
        reminder_enabled: !record.reminder_enabled,
      })
      .eq("id", record.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      !record.reminder_enabled
        ? "Reminders turned on for this item."
        : "Reminders turned off for this item."
    );

    loadData();
  }

  async function uploadDocument(record: UserComplianceRecord, file: File) {
    setMessage("Uploading document...");

    const fileExt = file.name.split(".").pop();
    const safeExt = fileExt || "file";
    const filePath = `${record.user_id}/${record.id}/${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("compliance-documents")
      .upload(filePath, file, {
        upsert: true,
      });

    if (uploadError) {
      setMessage(uploadError.message);
      return;
    }

    const { error: updateError } = await supabase
      .from("user_compliance_items")
      .update({
        document_url: filePath,
        document_name: file.name,
        document_uploaded_at: new Date().toISOString(),
      })
      .eq("id", record.id);

    if (updateError) {
      setMessage(updateError.message);
      return;
    }

    setMessage("Document uploaded successfully.");
    loadData();
  }

  async function viewDocument(record: UserComplianceRecord) {
    if (!record.document_url) {
      setMessage("No document found for this item.");
      return;
    }

    const { data, error } = await supabase.storage
      .from("compliance-documents")
      .createSignedUrl(record.document_url, 60 * 60);

    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Could not open document.");
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  function addMonths(date: string, months: number) {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d.toISOString().split("T")[0];
  }

  function calculateNextReminder(expirationDate: string) {
    const expires = new Date(expirationDate);
    const today = new Date();

    const daysUntilExpiration = Math.ceil(
      (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    const reminderDays =
      daysUntilExpiration >= 90 ? 90 : daysUntilExpiration >= 60 ? 60 : 30;

    const reminderDate = new Date(expirationDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);

    return reminderDate.toISOString().split("T")[0];
  }

  function getStatus(expirationDate: string | null) {
    if (!expirationDate) return "Not Started";

    const today = new Date();
    const expires = new Date(expirationDate);

    const days =
      (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (days < 0) return "Expired";
    if (days <= 30) return "Expiring Soon";
    return "Active";
  }

  function getStatusPriority(record: UserComplianceRecord) {
    const status = getStatus(record.expires_date);

    if (status === "Expired") return 1;
    if (status === "Expiring Soon") return 2;
    if (status === "Not Started") return 3;
    return 4;
  }

  function getProgressColor(percent: number) {
    if (percent < 40) return "#7f1d1d";
    if (percent < 75) return "#92400e";
    return "#14532d";
  }

  function getBadgeBackground(status: string) {
    if (status === "Expired") return "#7f1d1d";
    if (status === "Expiring Soon") return "#92400e";
    if (status === "Not Started") return "#374151";
    return "#14532d";
  }

  function getRequirementOwner(record: UserComplianceRecord) {
    return record.compliance_items?.requirement_owner || "artist";
  }

  function shouldShowForViewMode(record: UserComplianceRecord) {
    const owner = getRequirementOwner(record);

    if (viewMode === "both") return true;
    if (owner === "both") return true;

    return owner === viewMode;
  }

  function recordHasUsefulData(record: UserComplianceRecord) {
    return Boolean(
      record.completed_date ||
        record.expires_date ||
        record.next_reminder_date ||
        record.document_url ||
        record.document_name
    );
  }

  function dedupeRecords(inputRecords: UserComplianceRecord[]) {
    const map = new Map<string, UserComplianceRecord>();

    for (const record of inputRecords) {
      if (record.compliance_items?.active === false) {
        continue;
      }

      const key = [
        record.compliance_items?.name || "unknown",
        record.compliance_items?.category || "unknown",
        record.location_state || "state",
        record.location_county || "statewide",
        getRequirementOwner(record),
      ]
        .join("|")
        .toLowerCase();

      const existing = map.get(key);

      if (!existing) {
        map.set(key, record);
        continue;
      }

      const existingHasData = recordHasUsefulData(existing);
      const incomingHasData = recordHasUsefulData(record);

      if (!existingHasData && incomingHasData) {
        map.set(key, record);
        continue;
      }

      if (record.id > existing.id && existingHasData === incomingHasData) {
        map.set(key, record);
      }
    }

    return Array.from(map.values());
  }

  function getPreviewDates(record: UserComplianceRecord) {
    const completedDate = completionDates[record.id];

    if (!completedDate) {
      return null;
    }

    const renewalMonths = record.compliance_items?.default_expiry_months || 12;
    const previewExpiresDate = addMonths(completedDate, renewalMonths);
    const previewReminderDate = calculateNextReminder(previewExpiresDate);

    return {
      expiresDate: previewExpiresDate,
      reminderDate: previewReminderDate,
    };
  }

  async function handleStateChange(newState: string) {
    setLocationsReady(false);
    setState(newState);
    setCounty("");
    setCompletionDates({});
    setRecords([]);
    setItems([]);

    const counties = await loadCountiesForState(newState);

    setCounty(counties[0] || "");
    setLocationsReady(true);
  }

  function handleCountyChange(newCounty: string) {
    setCounty(newCounty);
    setCompletionDates({});
  }

  async function completeRecord(record: UserComplianceRecord) {
    setMessage("");

    const completedDate = completionDates[record.id];

    if (!completedDate) {
      setMessage("Please select a completion date.");
      return;
    }

    const renewalMonths = record.compliance_items?.default_expiry_months || 12;
    const expiresDate = addMonths(completedDate, renewalMonths);

    const { error } = await supabase
      .from("user_compliance_items")
      .update({
        completed_date: completedDate,
        expires_date: expiresDate,
        next_reminder_date: calculateNextReminder(expiresDate),
        reminder_enabled: true,
        status: "active",
      })
      .eq("id", record.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Compliance item updated.");
    setCompletionDates((prev) => {
      const updated = { ...prev };
      delete updated[record.id];
      return updated;
    });
    loadData();
  }

  const visibleRecords = dedupeRecords(records).filter(shouldShowForViewMode);

  const artistRecords = visibleRecords.filter((r) => {
    const owner = getRequirementOwner(r);
    return owner === "artist" || owner === "both";
  });

  const shopRecords = visibleRecords.filter((r) => {
    const owner = getRequirementOwner(r);
    return owner === "shop" || owner === "both";
  });

  const notStarted = visibleRecords.filter(
    (r) => getStatus(r.expires_date) === "Not Started"
  );

  const active = visibleRecords.filter(
    (r) => getStatus(r.expires_date) === "Active"
  );

  const expiring = visibleRecords.filter(
    (r) => getStatus(r.expires_date) === "Expiring Soon"
  );

  const expired = visibleRecords.filter(
    (r) => getStatus(r.expires_date) === "Expired"
  );

  function getNeedsAction(list: UserComplianceRecord[]) {
    return [...list]
      .filter((r) => getStatus(r.expires_date) !== "Active")
      .sort((a, b) => getStatusPriority(a) - getStatusPriority(b));
  }

  function getCompleted(list: UserComplianceRecord[]) {
    return list.filter((r) => getStatus(r.expires_date) === "Active");
  }

  const needsAction = getNeedsAction(visibleRecords);
  const completed = getCompleted(visibleRecords);

  const completedCount = visibleRecords.filter(
    (r) => r.completed_date && r.expires_date
  ).length;

  const totalCount = visibleRecords.length;

  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  function renderRecord(record: UserComplianceRecord, editable: boolean) {
    const status = getStatus(record.expires_date);
    const previewDates = getPreviewDates(record);
    const owner = getRequirementOwner(record);

    return (
      <div key={record.id} style={styles.record}>
        <div style={styles.recordContent}>
          <div>
            <strong>{record.compliance_items?.name}</strong>

            <div style={styles.badgeRow}>
              <span style={owner === "shop" ? styles.shopPill : styles.artistPill}>
                {owner === "shop"
                  ? "Shop-level"
                  : owner === "both"
                  ? "Artist + Shop"
                  : "Artist-level"}
              </span>

              {record.compliance_items?.verification_status === "verified" && (
                <span style={styles.verifiedBadge}>Verified</span>
              )}

              {record.compliance_items?.verification_status ===
                "needs_review" && (
                <span style={styles.reviewBadge}>Needs Review</span>
              )}

              {record.compliance_items?.jurisdiction_level && (
                <span style={styles.levelBadge}>
                  {record.compliance_items.jurisdiction_level}
                </span>
              )}
            </div>

            <p>
              {record.compliance_items?.category || "Compliance"} ·{" "}
              {record.location_state}
              {record.location_county ? `, ${record.location_county}` : ""}
            </p>

            {record.compliance_items?.required !== false && (
              <span style={styles.requiredPill}>Required</span>
            )}

            {record.compliance_items?.description && (
              <p style={styles.descriptionText}>
                {record.compliance_items.description}
              </p>
            )}

            <div style={styles.linkRow}>
              {record.compliance_items?.source_url && (
                <a
                  href={record.compliance_items.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.sourceLink}
                >
                  View official source
                </a>
              )}

              {record.compliance_items?.action_url && (
                <a
                  href={record.compliance_items.action_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.actionLink}
                >
                  {record.compliance_items.action_label ||
                    "Complete / Renew This Requirement"}
                </a>
              )}
            </div>

            <p>Completed: {record.completed_date || "Not entered"}</p>
            <p>Expires: {record.expires_date || "Not entered"}</p>
            <p>Next Reminder: {record.next_reminder_date || "None"}</p>

            <div style={styles.documentBox}>
              <p style={styles.documentLabel}>
                Document: {record.document_name || "No document uploaded"}
              </p>

              <div style={styles.documentActions}>
                {record.document_url && (
                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() => viewDocument(record)}
                  >
                    View Document
                  </button>
                )}

                <label style={styles.uploadButton}>
                  {record.document_name ? "Replace Document" : "Upload Document"}

                  <input
                    type="file"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];

                      if (file) {
                        uploadDocument(record, file);
                      }

                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              {record.document_uploaded_at && (
                <p style={styles.documentMeta}>
                  Uploaded:{" "}
                  {new Date(record.document_uploaded_at).toLocaleDateString()}
                </p>
              )}
            </div>
          </div>

          <div style={styles.toggleContainer}>
            <span style={styles.toggleLabel}>
              Reminders: {record.reminder_enabled ? "ON" : "OFF"}
            </span>

            <button
              style={{
                ...styles.toggleButton,
                background: record.reminder_enabled ? "#14532d" : "#444",
              }}
              onClick={() => toggleReminder(record)}
            >
              {record.reminder_enabled ? "Turn Off" : "Turn On"}
            </button>
          </div>

          {editable && (
            <div style={styles.inlineActions}>
              <div style={styles.dateField}>
                <label style={styles.inputLabel}>Completed Date</label>

                <input
                  style={styles.input}
                  type="date"
                  value={completionDates[record.id] || ""}
                  onChange={(e) =>
                    setCompletionDates((prev) => ({
                      ...prev,
                      [record.id]: e.target.value,
                    }))
                  }
                />

                <span style={styles.helperText}>
                  Enter the date this was completed. The app will automatically
                  calculate the expiration date and reminder schedule.
                </span>

                {previewDates && (
                  <div style={styles.previewBox}>
                    <p style={styles.previewText}>
                      Preview Expires:{" "}
                      <strong>{previewDates.expiresDate}</strong>
                    </p>
                    <p style={styles.previewText}>
                      Preview Reminder:{" "}
                      <strong>{previewDates.reminderDate}</strong>
                    </p>
                  </div>
                )}
              </div>

              <button style={styles.button} onClick={() => completeRecord(record)}>
                Save & Activate
              </button>
            </div>
          )}
        </div>

        <span
          style={{
            ...styles.badge,
            background: getBadgeBackground(status),
          }}
        >
          {status}
        </span>
      </div>
    );
  }

  function renderRequirementSection(
    title: string,
    recordsForSection: UserComplianceRecord[]
  ) {
    const sectionNeedsAction = getNeedsAction(recordsForSection);
    const sectionCompleted = getCompleted(recordsForSection);

    return (
      <>
        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>{title} — Needs Action</h2>

          {sectionNeedsAction.length === 0 && (
            <p style={styles.emptyMessage}>
              No required items currently need action.
            </p>
          )}

          {sectionNeedsAction.map((record) => renderRecord(record, true))}
        </section>

        <section style={styles.card}>
          <h2 style={styles.sectionTitle}>{title} — Completed Records</h2>

          {sectionCompleted.length === 0 && (
            <p style={styles.emptyMessage}>No active compliance records yet.</p>
          )}

          {sectionCompleted.map((record) => renderRecord(record, false))}
        </section>
      </>
    );
  }

  return (
    <main style={styles.page}>
      <header style={styles.header}>
        <img
          src="/apa-logo.png"
          alt="Artist Protection Alliance"
          style={styles.logo}
        />

        <div>
          <h1 style={styles.title}>Compliance Dashboard</h1>
          <p style={styles.subtitle}>
            Track requirements, expiration dates, documents, and automated
            reminders.
          </p>
        </div>
      </header>

      <section style={styles.stats}>
        <div style={styles.statCard}>
          <strong>{notStarted.length}</strong>
          <span>Not Started</span>
        </div>

        <div style={styles.statCard}>
          <strong>{active.length}</strong>
          <span>Active</span>
        </div>

        <div style={styles.statCard}>
          <strong>{expiring.length}</strong>
          <span>Expiring Soon</span>
        </div>

        <div style={styles.statCard}>
          <strong>{expired.length}</strong>
          <span>Expired</span>
        </div>
      </section>

      <section style={styles.card}>
        <h2 style={styles.sectionTitle}>Your Location</h2>

        <div style={styles.grid}>
          <select
            style={styles.input}
            value={state}
            onChange={(e) => handleStateChange(e.target.value)}
            disabled={stateOptions.length === 0}
          >
            {stateOptions.length === 0 && (
              <option value="">Loading states...</option>
            )}

            {stateOptions.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>

          <select
            style={styles.input}
            value={county}
            onChange={(e) => handleCountyChange(e.target.value)}
            disabled={countyOptions.length === 0}
          >
            {countyOptions.length === 0 && (
              <option value="">Statewide only</option>
            )}

            {countyOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.viewModeBox}>
          <div>
            <strong>Viewing requirements as:</strong>
            <p style={styles.helperText}>
              Artist view is for individual tattooers. Shop view includes
              studio-level records like permits, sharps disposal, and autoclave
              logs.
            </p>
          </div>

          <div style={styles.segmentedControl}>
            <button
              type="button"
              style={{
                ...styles.segmentButton,
                ...(viewMode === "artist" ? styles.segmentButtonActive : {}),
              }}
              onClick={() => setViewMode("artist")}
            >
              Artist
            </button>

            <button
              type="button"
              style={{
                ...styles.segmentButton,
                ...(viewMode === "shop" ? styles.segmentButtonActive : {}),
              }}
              onClick={() => setViewMode("shop")}
            >
              Shop
            </button>

            <button
              type="button"
              style={{
                ...styles.segmentButton,
                ...(viewMode === "both" ? styles.segmentButtonActive : {}),
              }}
              onClick={() => setViewMode("both")}
            >
              Both
            </button>
          </div>
        </div>

        <div style={styles.progressBox}>
          <div style={styles.progressHeader}>
            <strong>
              {completedCount} of {totalCount} completed
            </strong>
            <span>{progressPercent}%</span>
          </div>

          <div style={styles.progressBarBackground}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${progressPercent}%`,
                background: getProgressColor(progressPercent),
              }}
            />
          </div>

          <span style={styles.progressSubtext}>
            Your required compliance items load automatically when your location
            is selected. Duplicate master records are visually collapsed so the
            dashboard stays clean.
          </span>
        </div>

        {message && <p style={styles.message}>{message}</p>}
      </section>

      {viewMode === "both" ? (
        <>
          {renderRequirementSection("Artist Requirements", artistRecords)}
          {renderRequirementSection("Shop Requirements", shopRecords)}
        </>
      ) : viewMode === "shop" ? (
        renderRequirementSection("Shop Requirements", shopRecords)
      ) : (
        renderRequirementSection("Artist Requirements", artistRecords)
      )}
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#050505",
    color: "#ffffff",
    padding: 32,
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginBottom: 32,
    borderBottom: "1px solid #1f1f1f",
    paddingBottom: 24,
  },

  logo: {
    width: 260,
    maxWidth: "40vw",
  },

  title: {
    fontSize: 34,
    margin: 0,
    color: "#ffffff",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },

  subtitle: {
    color: "#FC5B00",
    marginTop: 8,
    fontSize: 15,
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 16,
    marginBottom: 24,
  },

  statCard: {
    background: "#111111",
    border: "1px solid #1f1f1f",
    borderRadius: 18,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: "0 8px 30px rgba(0,0,0,0.35)",
  },

  card: {
    background: "#0d0d0d",
    border: "1px solid #1f1f1f",
    borderRadius: 18,
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 12px 30px rgba(0,0,0,0.35)",
  },

  sectionTitle: {
    color: "#FC5B00",
    marginTop: 0,
    fontSize: 22,
    fontWeight: 700,
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },

  input: {
    padding: 14,
    borderRadius: 12,
    border: "1px solid #2B2B2B",
    background: "#111111",
    color: "#ffffff",
    fontSize: 14,
    outline: "none",
  },

  button: {
    background: "#FC5B00",
    color: "#ffffff",
    border: "none",
    padding: "13px 20px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 0 18px rgba(252,91,0,0.25)",
  },

  secondaryButton: {
    background: "#111111",
    color: "#ffffff",
    border: "1px solid #2B2B2B",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 13,
  },

  message: {
    color: "#FC5B00",
    fontWeight: 600,
  },

  emptyMessage: {
    color: "#FC5B00",
  },

  viewModeBox: {
    marginTop: 10,
    marginBottom: 18,
    padding: 16,
    borderRadius: 14,
    background: "#111111",
    border: "1px solid #1f1f1f",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
  },

  segmentedControl: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },

  segmentButton: {
    background: "#0d0d0d",
    color: "#ffffff",
    border: "1px solid #2B2B2B",
    padding: "10px 14px",
    borderRadius: 999,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 13,
  },

  segmentButtonActive: {
    background: "#FC5B00",
    color: "#ffffff",
    border: "1px solid #FC5B00",
    boxShadow: "0 0 18px rgba(252,91,0,0.25)",
  },

  progressBox: {
    marginTop: 8,
    padding: 16,
    borderRadius: 14,
    background: "#111111",
    border: "1px solid #1f1f1f",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    color: "#FC5B00",
  },

  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  progressBarBackground: {
    width: "100%",
    height: 10,
    background: "#1f1f1f",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    transition: "all 0.4s ease",
  },

  progressSubtext: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: 6,
  },

  record: {
    display: "flex",
    justifyContent: "space-between",
    gap: 20,
    padding: 20,
    border: "1px solid #1f1f1f",
    borderRadius: 16,
    marginBottom: 12,
    background: "#111111",
  },

  recordContent: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 14,
    flex: 1,
  },

  inlineActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },

  dateField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxWidth: 380,
  },

  inputLabel: {
    fontSize: 13,
    color: "#FC5B00",
    fontWeight: "bold",
  },

  helperText: {
    fontSize: 12,
    color: "#9CA3AF",
    lineHeight: 1.4,
    margin: "4px 0 0",
  },

  previewBox: {
    marginTop: 6,
    padding: 10,
    borderRadius: 10,
    border: "1px solid #2B2B2B",
    background: "#0d0d0d",
  },

  previewText: {
    margin: "2px 0",
    fontSize: 12,
    color: "#FC5B00",
  },

  toggleContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxWidth: 180,
  },

  toggleLabel: {
    fontSize: 12,
    color: "#FC5B00",
    fontWeight: "bold",
  },

  toggleButton: {
    border: "none",
    padding: "8px 12px",
    borderRadius: 8,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: "bold",
  },

  badge: {
    height: "fit-content",
    color: "#ffffff",
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 13,
    whiteSpace: "nowrap",
    fontWeight: 700,
  },

  requiredPill: {
    display: "inline-block",
    width: "fit-content",
    background: "#1f1f1f",
    color: "#FC5B00",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
    border: "1px solid #FC5B00",
  },

  artistPill: {
    display: "inline-block",
    width: "fit-content",
    background: "#111827",
    color: "#93C5FD",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
    border: "1px solid #1E3A8A",
  },

  shopPill: {
    display: "inline-block",
    width: "fit-content",
    background: "#2a1606",
    color: "#FDBA74",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
    border: "1px solid #FC5B00",
  },

  descriptionText: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 1.5,
    maxWidth: 720,
  },

  sourceLink: {
    color: "#FC5B00",
    fontSize: 13,
    fontWeight: "bold",
    textDecoration: "underline",
  },

  actionLink: {
    color: "#FC5B00",
    fontSize: 13,
    fontWeight: "bold",
    textDecoration: "underline",
  },

  linkRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
    marginTop: 8,
    marginBottom: 8,
  },

  badgeRow: {
    display: "flex",
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
    flexWrap: "wrap",
  },

  verifiedBadge: {
    background: "#0f2a1b",
    color: "#4ADE80",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
  },

  reviewBadge: {
    background: "#3b0d0d",
    color: "#FF7B7B",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
  },

  levelBadge: {
    background: "#1f2937",
    color: "#CBD5E1",
    padding: "4px 8px",
    borderRadius: 999,
    fontSize: 11,
  },

  documentBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    background: "#0d0d0d",
    border: "1px solid #2B2B2B",
  },

  documentLabel: {
    color: "#ffffff",
    fontSize: 13,
    margin: "0 0 10px",
    fontWeight: "bold",
  },

  documentActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 10,
    alignItems: "center",
  },

  uploadButton: {
    display: "inline-block",
    background: "#1f1f1f",
    color: "#FC5B00",
    border: "1px solid #FC5B00",
    padding: "10px 14px",
    borderRadius: 10,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 13,
  },

  documentMeta: {
    color: "#9CA3AF",
    fontSize: 12,
    margin: "10px 0 0",
  },
};
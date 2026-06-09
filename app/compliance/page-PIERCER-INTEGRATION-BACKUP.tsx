"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { supabase } from "@/lib/supabase";
import AllianceGate from "@/components/AllianceGate";

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
  is_inapplicable?: boolean;
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
  is_inapplicable?: boolean;
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

type DocumentArchiveRecord = {
  id: number;
  user_compliance_item_id: number;
  user_id: number;
  file_path: string;
  file_name: string;
  archived_reason: string | null;
  archived_at: string;
};

type StateOption = {
  value: string;
  label: string;
};

type ViewMode = "artist" | "shop" | "both";
type StatusFilter =
  | "all"
  | "needs_action"
  | "not_started"
  | "active"
  | "expiring"
  | "expired";

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

function isBloodbornePathogensRequirement(name?: string | null, category?: string | null) {
  const value = `${name || ""} ${category || ""}`.toLowerCase();

  return (
    value.includes("bloodborne") ||
    value.includes("blood borne") ||
    value.includes("bbp") ||
    value.includes("osha blood")
  );
}

function getDisplayRequirementName(record: UserComplianceRecord) {
  const rawName = record.compliance_items?.name || "Compliance item";

  if (isBloodbornePathogensRequirement(rawName, record.compliance_items?.category)) {
    return "OSHA Bloodborne Pathogens Training";
  }

  return rawName;
}

function getDisplayRequirementCategory(record: UserComplianceRecord) {
  const rawCategory = record.compliance_items?.category || "Compliance";

  if (isBloodbornePathogensRequirement(record.compliance_items?.name, rawCategory)) {
    return "OSHA / Safety";
  }

  return rawCategory;
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
  const [shareComplianceStatus, setShareComplianceStatus] = useState(false);
  const [documentHistory, setDocumentHistory] = useState<
    Record<number, DocumentArchiveRecord[]>
  >({});
  const [openHistory, setOpenHistory] = useState<Record<number, boolean>>({});
  const [completionDates, setCompletionDates] = useState<Record<number, string>>(
    {}
  );
const [searchTerm, setSearchTerm] = useState("");
const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
const [categoryFilter, setCategoryFilter] = useState("all");
const [documentSearchTerm, setDocumentSearchTerm] = useState("");
const [showExcludedItems, setShowExcludedItems] = useState(false);
const [documentVaultOpen, setDocumentVaultOpen] = useState(false);

const [isAllianceMember] = useState(true);

const userId = 1;

useEffect(() => {
  loadLocationOptions();
  loadSharingPreference();
}, []);

useEffect(() => {
  if (!locationsReady || !state) return;
  autoPopulate();
}, [locationsReady, state, county]);

  async function loadSharingPreference() {
    const { data, error } = await supabase
      .from("members")
      .select("share_compliance_status")
      .eq("id", userId)
      .maybeSingle();

    if (!error && data) {
      setShareComplianceStatus(Boolean(data.share_compliance_status));
    }
  }

  async function toggleShareComplianceStatus() {
    const nextValue = !shareComplianceStatus;

    const { error } = await supabase
      .from("members")
      .update({ share_compliance_status: nextValue })
      .eq("id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setShareComplianceStatus(nextValue);
    setMessage(
      nextValue
        ? "Compliance status sharing turned on."
        : "Compliance status sharing turned off."
    );
  }

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

    const defaultState = uniqueStates.includes("AZ")
      ? "AZ"
      : uniqueStates[0] || "";

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
      .select(
        `
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
      `
      )
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
      .update({ reminder_enabled: !record.reminder_enabled })
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

  async function archiveCurrentDocument(
    record: UserComplianceRecord,
    reason: "replaced" | "archived" = "archived"
  ) {
    if (!record.document_url || !record.document_name) {
      setMessage("No current document to archive.");
      return false;
    }

    const { error: archiveError } = await supabase
      .from("compliance_document_history")
      .insert({
        user_compliance_item_id: record.id,
        user_id: record.user_id,
        file_path: record.document_url,
        file_name: record.document_name,
        archived_reason: reason,
        archived_at: new Date().toISOString(),
      });

    if (archiveError) {
      setMessage(archiveError.message);
      return false;
    }

    return true;
  }

  async function uploadDocument(record: UserComplianceRecord, file: File) {
    setMessage("Uploading document...");

    if (record.document_url && record.document_name) {
      const archived = await archiveCurrentDocument(record, "replaced");
      if (!archived) return;
    }

    const fileExt = file.name.split(".").pop();
    const safeExt = fileExt || "file";
    const filePath = `${record.user_id}/${record.id}/${Date.now()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("compliance-documents")
      .upload(filePath, file, { upsert: true });

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

    setMessage(
      record.document_name
        ? "Document replaced and previous version archived."
        : "Document uploaded successfully."
    );
    await loadDocumentHistory(record.id);
    loadData();
  }

  async function archiveAndClearCurrentDocument(record: UserComplianceRecord) {
    const confirmed = window.confirm(
      "Archive this current document? It will be moved to history and removed as the active document."
    );

    if (!confirmed) return;

    const archived = await archiveCurrentDocument(record, "archived");
    if (!archived) return;

    const { error } = await supabase
      .from("user_compliance_items")
      .update({
        document_url: null,
        document_name: null,
        document_uploaded_at: null,
      })
      .eq("id", record.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Document archived.");
    await loadDocumentHistory(record.id);
    loadData();
  }

  async function loadDocumentHistory(recordId: number) {
    const { data, error } = await supabase
      .from("compliance_document_history")
      .select("*")
      .eq("user_compliance_item_id", recordId)
      .order("archived_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setDocumentHistory((prev) => ({
      ...prev,
      [recordId]: (data as DocumentArchiveRecord[]) || [],
    }));
  }

  async function toggleDocumentHistory(record: UserComplianceRecord) {
    const nextOpen = !openHistory[record.id];

    setOpenHistory((prev) => ({
      ...prev,
      [record.id]: nextOpen,
    }));

    if (nextOpen) {
      await loadDocumentHistory(record.id);
    }
  }

  async function viewStorageDocument(filePath: string) {
    const { data, error } = await supabase.storage
      .from("compliance-documents")
      .createSignedUrl(filePath, 60 * 60);

    if (error || !data?.signedUrl) {
      setMessage(error?.message || "Could not open document.");
      return;
    }

    window.location.href = data.signedUrl;
  }

  async function viewDocument(record: UserComplianceRecord) {
    if (!record.document_url) {
      setMessage("No document found for this item.");
      return;
    }

    await viewStorageDocument(record.document_url);
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

  function getDaysUntil(expirationDate: string | null) {
    if (!expirationDate) return null;

    const today = new Date();
    const expires = new Date(expirationDate);

    return Math.ceil(
      (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  function getUrgencyText(record: UserComplianceRecord) {
    const status = getStatus(record.expires_date);
    const days = getDaysUntil(record.expires_date);

    if (status === "Not Started") return "Add completion date to activate";
    if (days === null) return "No expiration date entered";
    if (status === "Expired")
      return `Expired ${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
    if (status === "Expiring Soon")
      return `Expires in ${days} day${days === 1 ? "" : "s"}`;
    return `Valid for ${days} more day${days === 1 ? "" : "s"}`;
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
    if (percent < 75) return "#FC5B00";
    return "#16A34A";
  }

  function getBadgeBackground(status: string) {
    if (status === "Expired") return "#7f1d1d";
    if (status === "Expiring Soon") return "#FC5B00";
    if (status === "Not Started") return "#374151";
    return "#14532d";
  }

  function getRecordAccent(status: string): CSSProperties {
    if (status === "Expired") {
      return {
        border: "1px solid rgba(239, 68, 68, 0.45)",
        boxShadow: "0 18px 40px rgba(127, 29, 29, 0.28)",
      };
    }

    if (status === "Expiring Soon") {
      return {
        border: "1px solid rgba(252, 91, 0, 0.55)",
        boxShadow: "0 18px 40px rgba(252, 91, 0, 0.12)",
      };
    }

    if (status === "Active") {
      return {
        border: "1px solid rgba(34, 197, 94, 0.25)",
      };
    }

    return {};
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
      if (record.compliance_items?.active === false) continue;

      const displayName = getDisplayRequirementName(record);
      const displayCategory = getDisplayRequirementCategory(record);

      const key = [
        displayName,
        displayCategory,
        record.location_state || "state",
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

      const existingStatus = getStatus(existing.expires_date);
      const incomingStatus = getStatus(record.expires_date);

      if (existingStatus !== "Active" && incomingStatus === "Active") {
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

    if (!completedDate) return null;

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
async function restoreExcludedItem(recordId: number) {
  const { error } = await supabase
    .from("user_compliance_items")
    .update({
      is_inapplicable: false,
    })
    .eq("id", recordId);

  if (error) {
    console.error("Restore failed:", error);
    return;
  }

  setRecords((prev) =>
    prev.map((record) =>
      record.id === recordId
        ? {
            ...record,
            is_inapplicable: false,
          }
        : record
    )
  );
}
  function recordMatchesFilters(record: UserComplianceRecord) {
    const status = getStatus(record.expires_date);
    const displayName = getDisplayRequirementName(record);
    const category = getDisplayRequirementCategory(record);
    const search = searchTerm.trim().toLowerCase();

    const matchesSearch =
      !search ||
      [
        displayName,
        category,
        record.compliance_items?.description,
        record.location_state,
        record.location_county,
        record.document_name,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search);

    const matchesCategory =
      categoryFilter === "all" || category === categoryFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "needs_action" && status !== "Active") ||
      (statusFilter === "not_started" && status === "Not Started") ||
      (statusFilter === "active" && status === "Active") ||
      (statusFilter === "expiring" && status === "Expiring Soon") ||
      (statusFilter === "expired" && status === "Expired");

    return matchesSearch && matchesCategory && matchesStatus;
  }

const activeRecords = dedupeRecords(records).filter(
  (record) =>
    shouldShowForViewMode(record) &&
    !record.is_inapplicable
);

const excludedRecords = dedupeRecords(records).filter(
  (record) =>
    shouldShowForViewMode(record) &&
    record.is_inapplicable
);

const filteredRecords = activeRecords.filter((record) =>
  recordMatchesFilters(record)
);

const visibleRecords = filteredRecords;

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        visibleRecords
          .map((record) => getDisplayRequirementCategory(record))
          .filter(Boolean)
      )
    ).sort();

    return categories;
  }, [visibleRecords]);

  const artistRecords = filteredRecords.filter((r) => {
    const owner = getRequirementOwner(r);
    return owner === "artist" || owner === "both";
  });

  const shopRecords = filteredRecords.filter((r) => {
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
    return [...list]
      .filter((r) => getStatus(r.expires_date) === "Active")
      .sort((a, b) => {
        const aDate = a.expires_date || "9999-12-31";
        const bDate = b.expires_date || "9999-12-31";
        return aDate.localeCompare(bDate);
      });
  }

const applicableRecords = visibleRecords;

const completedCount = applicableRecords.filter(
  (r) => r.completed_date && r.expires_date
).length;

const totalCount = applicableRecords.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  const activityFeed = useMemo(() => {
    return visibleRecords
      .flatMap((record) => {
        const status = getStatus(record.expires_date);
        const name = getDisplayRequirementName(record);

        const events = [];

        if (record.document_uploaded_at) {
          events.push({
            date: record.document_uploaded_at,
            title: "Document uploaded",
            detail: `${name} has a document in the vault.`,
          });
        }

        if (record.completed_date) {
          events.push({
            date: record.completed_date,
            title: "Record completed",
            detail: `${name} was marked complete.`,
          });
        }

        if (status === "Expired") {
          events.push({
            date: record.expires_date || new Date().toISOString(),
            title: "Expired item needs attention",
            detail: `${name} is expired.`,
          });
        }

        if (status === "Expiring Soon") {
          events.push({
            date: record.expires_date || new Date().toISOString(),
            title: "Expiration coming up",
            detail: `${name} expires soon.`,
          });
        }

        return events;
      })
      .sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      )
      .slice(0, 6);
  }, [visibleRecords]);

  function renderEmptyState(title: string, body: string) {
    return (
      <div style={styles.emptyState}>
        <div style={styles.emptyIcon}>APA</div>
        <div>
          <strong>{title}</strong>
          <p>{body}</p>
        </div>
      </div>
    );
  }

  function renderRecord(record: UserComplianceRecord, editable: boolean) {
    const status = getStatus(record.expires_date);
    const previewDates = getPreviewDates(record);
    const owner = getRequirementOwner(record);
    const history = documentHistory[record.id] || [];
    const isHistoryOpen = openHistory[record.id];
    const displayName = getDisplayRequirementName(record);
    const displayCategory = getDisplayRequirementCategory(record);

    return (
      <div key={record.id} style={{ ...styles.record, ...getRecordAccent(status) }}>
        <div style={styles.recordTop}>
          <div>
            <div style={styles.recordTitleRow}>
              <strong style={styles.recordTitle}>
                {displayName}
              </strong>
              <span
                style={{
                  ...styles.badge,
                  background: getBadgeBackground(status),
                }}
              >
                {status}
              </span>
            </div>

            <p style={styles.urgencyText}>{getUrgencyText(record)}</p>

            <div style={styles.badgeRow}>
              <span
                style={
                  owner === "shop"
                    ? styles.shopPill
                    : owner === "both"
                    ? styles.bothPill
                    : styles.artistPill
                }
              >
                {owner === "shop"
                  ? "Shop-level"
                  : owner === "both"
                  ? "Artist + Shop"
                  : "Artist-level"}
              </span>

              {record.compliance_items?.verification_status === "verified" && (
                <span style={styles.verifiedBadge}>Verified</span>
              )}

              {record.compliance_items?.jurisdiction_level && (
                <span style={styles.levelBadge}>
                  {record.compliance_items.jurisdiction_level}
                </span>
              )}

              {record.compliance_items?.required !== false && (
                <span style={styles.requiredPill}>Required</span>
              )}
            </div>

            <p style={styles.recordMeta}>
              {displayCategory} ·{" "}
              {record.location_state}
              {record.location_county ? `, ${record.location_county}` : ""}
            </p>
          </div>
        </div>

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

        <div style={styles.recordDetailsGrid}>
          <div style={styles.detailCard}>
            <span>Completed</span>
            <strong>{record.completed_date || "Not entered"}</strong>
          </div>

          <div style={styles.detailCard}>
            <span>Expires</span>
            <strong>{record.expires_date || "Not entered"}</strong>
          </div>

          <div style={styles.detailCard}>
            <span>Next Reminder</span>
            <strong>{record.next_reminder_date || "None"}</strong>
          </div>

          <div style={styles.detailCard}>
            <span>Reminders</span>
            <button
              style={{
                ...styles.miniToggleButton,
                background: record.reminder_enabled ? "#14532d" : "#444",
              }}
              onClick={() => toggleReminder(record)}
            >
              {record.reminder_enabled ? "ON" : "OFF"}
            </button>
          </div>
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
                Enter the date this was completed. APA will calculate the
                expiration date and reminder schedule.
              </span>

              {previewDates && (
                <div style={styles.previewBox}>
                  <p style={styles.previewText}>
                    Preview Expires: <strong>{previewDates.expiresDate}</strong>
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

        <div style={styles.compactDocumentBox}>
          <div>
            <strong>Document</strong>
            <p style={styles.documentMeta}>
              {record.document_name
                ? `Current file: ${record.document_name}`
                : "No current document uploaded"}
            </p>
          </div>

<div style={styles.documentActions}>
  {record.document_url && (
    <button
      type="button"
      style={styles.secondaryButton}
      onClick={() => viewDocument(record)}
    >
      View
    </button>
  )}

  <label style={styles.uploadButton}>
    {record.document_name ? "Replace" : "Upload"}

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

  <button
  type="button"
  style={styles.secondaryButton}
  onClick={async () => {
    const { error } = await supabase
      .from("user_compliance_items")
      .update({
        is_inapplicable: !record.is_inapplicable,
      })
      .eq("id", record.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
  !record.is_inapplicable
    ? "Item moved to Excluded / N/A Items."
    : "Item restored."
);

loadData();
  }}
>
  {record.is_inapplicable
    ? "Marked N/A"
    : "Mark N/A"}
</button>
</div>
        </div>
      </div>
    );
  }

  const vaultRecords = visibleRecords.filter((record) => {
    const search = documentSearchTerm.trim().toLowerCase();

    if (!search) return true;

    return [
      getDisplayRequirementName(record),
      getDisplayRequirementCategory(record),
      record.document_name,
      record.location_state,
      record.location_county,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(search);
  });

function renderDocumentVault() {
  return (
    <section style={styles.card}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>Documents</p>

          <h2 style={styles.sectionTitle}>Document Vault</h2>

          <p style={styles.helperText}>
            Reference previous and current compliance documents when needed.
            This stays collapsed so your main dashboard stays focused.
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={styles.sectionCount}>
            {visibleRecords.filter((record) => record.document_url).length}
          </span>

          <button
            type="button"
            style={styles.secondaryButton}
            onClick={() => setDocumentVaultOpen(!documentVaultOpen)}
          >
            {documentVaultOpen ? "Hide Vault" : "Open Vault"}
          </button>
        </div>
      </div>

      {!documentVaultOpen && (
        <div
          style={{
            paddingTop: 6,
          }}
        >
          <p
            style={{
              color: "#9CA3AF",
              fontSize: 13,
              margin: 0,
            }}
          >
            Vault collapsed to keep the dashboard clean.
          </p>
        </div>
      )}

      {documentVaultOpen && (
        <>
          <div style={styles.vaultSearchRow}>
            <input
              style={styles.input}
              value={documentSearchTerm}
              placeholder="Search document vault by file, requirement, category, state, or county..."
              onChange={(e) => setDocumentSearchTerm(e.target.value)}
            />
          </div>

          {vaultRecords.length === 0 &&
            renderEmptyState(
              "No documents match your search.",
              "Clear the vault search or upload a document from one of your compliance records."
            )}

          <div style={styles.documentVaultGrid}>
            {vaultRecords.map((record) => {
              const history = documentHistory[record.id] || [];
              const isHistoryOpen = openHistory[record.id];

              return (
                <div key={`vault-${record.id}`} style={styles.vaultItem}>
                  <div style={styles.documentHeader}>
                    <div>
                      <strong>{getDisplayRequirementName(record)}</strong>

                      <p style={styles.documentMeta}>
                        {getDisplayRequirementCategory(record)} ·{" "}
                        {record.location_state}
                        {record.location_county
                          ? `, ${record.location_county}`
                          : ""}
                      </p>

                      <p style={styles.documentMeta}>
                        Current file:{" "}
                        {record.document_name ||
                          "No current document uploaded"}
                      </p>
                    </div>

                    {record.document_uploaded_at && (
                      <span style={styles.documentDate}>
                        Updated{" "}
                        {new Date(
                          record.document_uploaded_at
                        ).toLocaleDateString()}
                      </span>
                    )}
                  </div>

                  <div style={styles.documentActions}>
                    {record.document_url && (
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() => viewDocument(record)}
                      >
                        View Current
                      </button>
                    )}

                    {record.document_url && (
                      <button
                        type="button"
                        style={styles.secondaryButton}
                        onClick={() =>
                          archiveAndClearCurrentDocument(record)
                        }
                      >
                        Archive Current
                      </button>
                    )}

                    <label style={styles.uploadButton}>
                      {record.document_name
                        ? "Replace Document"
                        : "Upload Document"}

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

                    <button
  type="button"
  style={styles.secondaryButton}
  onClick={() => toggleDocumentHistory(record)}
>
  {isHistoryOpen
    ? "Hide History"
    : "View History"}
</button>

<button
  type="button"
  style={styles.secondaryButton}
  onClick={async () => {
    const { error } = await supabase
      .from("user_compliance_items")
      .update({
        is_inapplicable: !record.is_inapplicable,
      })
      .eq("id", record.id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
  !record.is_inapplicable
    ? "Item moved to Excluded / N/A Items."
    : "Item restored."
);

loadData();
  }}
>
  {record.is_inapplicable
    ? "Marked N/A"
    : "Mark N/A"}
</button>
                  </div>

                  {isHistoryOpen && (
                    <div style={styles.historyBox}>
                      {history.length === 0 && (
                        <p style={styles.documentMeta}>
                          No archived documents yet.
                        </p>
                      )}

                      {history.map((doc) => (
                        <div key={doc.id} style={styles.historyItem}>
                          <div>
                            <strong>{doc.file_name}</strong>

                            <p style={styles.documentMeta}>
                              Archived:{" "}
                              {new Date(
                                doc.archived_at
                              ).toLocaleDateString()}{" "}
                              · {doc.archived_reason || "archived"}
                            </p>
                          </div>

                          <button
                            type="button"
                            style={styles.secondaryButton}
                            onClick={() =>
                              viewStorageDocument(doc.file_path)
                            }
                          >
                            View
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

  function renderActivityFeed() {
    return (
      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.eyebrow}>Recent Activity</p>
            <h2 style={styles.sectionTitle}>Activity Feed</h2>
          </div>
        </div>

        {activityFeed.length === 0 ? (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>APA</div>
            <div>
              <strong>No activity yet.</strong>
              <p>
                Upload a document or complete a record to start building
                history.
              </p>
            </div>
          </div>
        ) : (
          <div style={styles.activityList}>
            {activityFeed.map((activity, index) => (
              <div key={`${activity.title}-${index}`} style={styles.activityItem}>
                <div style={styles.activityDot} />

                <div>
                  <strong>{activity.title}</strong>
                  <p>{activity.detail}</p>
                  <span>{new Date(activity.date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
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
          <div style={styles.sectionHeader}>
            <div>
              <p style={styles.eyebrow}>Priority</p>
              <h2 style={styles.sectionTitle}>{title} — Needs Attention</h2>
            </div>

            <span style={styles.sectionCount}>{sectionNeedsAction.length}</span>
          </div>

          {sectionNeedsAction.length === 0 &&
  renderEmptyState(
    "You're fully up to date.",
    "All visible compliance requirements in this section are currently active."
  )}

          {sectionNeedsAction.map((record) => renderRecord(record, true))}
                </section>

        <section style={styles.completedCard}>
          <div style={styles.sectionHeader}>
            <div>
              <p style={styles.eyebrow}>Current</p>
              <h2 style={styles.sectionTitle}>{title} — Completed Records</h2>
            </div>

            <span style={styles.sectionCount}>{sectionCompleted.length}</span>
          </div>

          {sectionCompleted.length === 0 &&
  renderEmptyState(
    "No completed records yet.",
    "Completed licenses, permits, and certifications will appear here once activated."
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

        <div style={styles.headerText}>
          <p style={styles.eyebrow}>Artist Protection Alliance</p>
          <h1 style={styles.title}>Compliance Dashboard</h1>
          <p style={styles.subtitle}>
            Track licenses, certifications, expiration dates, documents, and
            reminders in one clean workspace.
          </p>
        </div>
      </header>

      <section style={styles.hero}>
        <div style={styles.heroMain}>
          <p style={styles.eyebrow}>Compliance Health</p>
          <h2 style={styles.heroScore}>{progressPercent}%</h2>
          <p style={styles.heroCopy}>
            {completedCount} of {totalCount} required records are completed for{" "}
            {formatStateLabel(state)}
            {county ? `, ${county}` : ""}.
          </p>

          <div style={styles.progressBarBackground}>
            <div
              style={{
                ...styles.progressBarFill,
                width: `${progressPercent}%`,
                background: getProgressColor(progressPercent),
              }}
            />
          </div>
        </div>

        <div style={styles.heroStats}>
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
        </div>
      </section>

      <section style={styles.card}>
        <div style={styles.sectionHeader}>
          <div>
            <p style={styles.eyebrow}>Workspace Controls</p>
            <h2 style={styles.sectionTitle}>Location, View & Filters</h2>
          </div>
        </div>

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

          <input
            style={styles.input}
            value={searchTerm}
            placeholder="Search records, documents, categories..."
            onChange={(e) => setSearchTerm(e.target.value)}
          />

          <select
            style={styles.input}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="needs_action">Needs action</option>
            <option value="not_started">Not started</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring soon</option>
            <option value="expired">Expired</option>
          </select>

          <select
            style={styles.input}
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
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

        <div style={styles.shareBox}>
          <div>
            <strong>Job Hub Privacy</strong>
            <p style={styles.helperText}>
              Share only your compliance status with shops/employers later.
              Uploaded documents stay private unless you choose otherwise.
            </p>
          </div>

          <button
            type="button"
            style={{
              ...styles.toggleButton,
              background: shareComplianceStatus ? "#14532d" : "#444",
            }}
            onClick={toggleShareComplianceStatus}
          >
            {shareComplianceStatus ? "Sharing ON" : "Sharing OFF"}
          </button>
        </div>

        <p style={styles.disclaimer}>
          APA helps organize compliance records and reminders. APA does not
          certify legal compliance or replace local, state, or federal
          requirements.
        </p>

       {message &&
  !message.toLowerCase().includes("uploaded successfully") &&
  !message.toLowerCase().includes("document archived") &&
  !message.toLowerCase().includes("compliance item updated") &&
  !message.toLowerCase().includes("required compliance items loaded") && (
    <p style={styles.message}>{message}</p>
)}
      </section>

      {filteredRecords.length === 0 && (
        <section style={styles.card}>
         {renderEmptyState(
  "No records match your filters.",
  "Try clearing the search box, changing filters, or switching between Artist, Shop, and Both."
)}
        </section>
      )}

      <AllianceGate
  allowed={isAllianceMember}
  title="Alliance Compliance Tools"
  description="Unlock document vault storage, expiration tracking, reminder emails, compliance history, uploads, and full compliance management tools for artists and shops."
>
  {renderActivityFeed()}

        {viewMode === "both" ? (
          <>
            {renderRequirementSection(
              "Artist Requirements",
              artistRecords
            )}

            {renderRequirementSection(
              "Shop Requirements",
              shopRecords
            )}
          </>
        ) : viewMode === "shop" ? (
          renderRequirementSection(
            "Shop Requirements",
            shopRecords
          )
        ) : (
          renderRequirementSection(
            "Artist Requirements",
            artistRecords
          )
        )}
{/* EXCLUDED / N/A ITEMS */}
<div
  style={{
    marginTop: "40px",
    border: "1px solid rgba(255,92,0,0.14)",
    borderRadius: "18px",
    background: "#0d0d0d",
    overflow: "hidden",
  }}
>
  <button
    onClick={() => setShowExcludedItems(!showExcludedItems)}
    style={{
      width: "100%",
      background: "transparent",
      border: "none",
      color: "#ff9b66",
      padding: "18px 22px",
      cursor: "pointer",
      fontSize: "15px",
      fontWeight: 700,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    <span>
      Excluded / N/A Items ({excludedRecords.length})
    </span>

    <span>
      {showExcludedItems ? "−" : "+"}
    </span>
  </button>

  {showExcludedItems && (
    <div
      style={{
        padding: "0 20px 20px",
      }}
    >
      {excludedRecords.length === 0 ? (
        <div
          style={{
            color: "#777",
            padding: "10px 0",
          }}
        >
          No excluded items.
        </div>
      ) : (
        excludedRecords.map((record) => (
          <div
            key={record.id}
            style={{
              border: "1px solid rgba(255,255,255,0.06)",
              borderRadius: "14px",
              padding: "16px",
              marginTop: "14px",
              background: "#121212",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "14px",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    color: "#f4f4f4",
                    fontSize: "15px",
                  }}
                >
                  {getDisplayRequirementName(record)}
                </div>

                <div
                  style={{
                    color: "#888",
                    fontSize: "13px",
                    marginTop: "4px",
                  }}
                >
                  Excluded from compliance tracking
                <div
  style={{
    color: "#666",
    fontSize: "12px",
    marginTop: "6px",
  }}
>
  This item does not affect compliance scoring,
  reminders, expirations, or dashboard alerts.
</div>
                </div>
              </div>

              <button
                onClick={() => restoreExcludedItem(record.id)}
                style={{
                  background: "#ff5c00",
                  border: "none",
                  color: "white",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  fontWeight: 700,
                }}
              >
                Restore Item
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  )}
</div>
        {renderDocumentVault()}
      </AllianceGate>
    </main>
  );
}

const styles: Record<string, CSSProperties> = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(252,91,0,0.13), transparent 32%), linear-gradient(180deg, #050505 0%, #090909 48%, #050505 100%)",
    color: "#ffffff",
    padding: 32,
    fontFamily: "Arial, sans-serif",
  },

  header: {
    display: "flex",
    alignItems: "center",
    gap: 24,
    marginBottom: 28,
    borderBottom: "1px solid rgba(255,255,255,0.08)",
    paddingBottom: 24,
  },

  logo: {
    width: 240,
    maxWidth: "40vw",
    filter: "drop-shadow(0 18px 35px rgba(0,0,0,0.45))",
  },

  headerText: {
    maxWidth: 760,
  },

  eyebrow: {
    margin: "0 0 7px",
    color: "#FC5B00",
    fontSize: 11,
    fontWeight: 800,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
  },

  title: {
    fontSize: 40,
    margin: 0,
    color: "#ffffff",
    fontWeight: 900,
    letterSpacing: "-0.04em",
  },

  subtitle: {
    color: "#D1D5DB",
    marginTop: 10,
    fontSize: 15,
    lineHeight: 1.6,
  },

  hero: {
    display: "grid",
    gridTemplateColumns: "minmax(260px, 1.1fr) minmax(280px, 1fr)",
    gap: 18,
    marginBottom: 24,
  },

  heroMain: {
    background:
      "linear-gradient(135deg, rgba(252,91,0,0.16), rgba(17,17,17,0.98))",
    border: "1px solid rgba(252,91,0,0.28)",
    borderRadius: 24,
    padding: 28,
    boxShadow: "0 22px 60px rgba(0,0,0,0.45)",
  },

  heroScore: {
    margin: "0 0 4px",
    fontSize: 76,
    lineHeight: 1,
    letterSpacing: "-0.07em",
    color: "#ffffff",
  },

  heroCopy: {
    color: "#D1D5DB",
    margin: "0 0 18px",
    lineHeight: 1.6,
  },

  heroStats: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(130px, 1fr))",
    gap: 14,
  },

  statCard: {
    background: "rgba(17,17,17,0.86)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 20,
    padding: 22,
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: 6,
    boxShadow: "0 12px 30px rgba(0,0,0,0.32)",
  },

  card: {
    background: "rgba(13,13,13,0.92)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 22,
    padding: 24,
    marginBottom: 24,
    boxShadow: "0 18px 50px rgba(0,0,0,0.36)",
  },
  completedCard: {
  background:
    "linear-gradient(180deg, rgba(15,15,15,0.96), rgba(11,11,11,0.96))",
  border: "1px solid rgba(34,197,94,0.12)",
  borderRadius: 22,
  padding: 24,
  marginBottom: 24,
  boxShadow: "0 12px 35px rgba(0,0,0,0.28)",
},

  sectionHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
    alignItems: "flex-start",
    marginBottom: 18,
  },

  sectionTitle: {
    color: "#ffffff",
    margin: 0,
    fontSize: 24,
    fontWeight: 850,
    letterSpacing: "-0.03em",
  },

  sectionCount: {
    background: "#FC5B00",
    color: "#ffffff",
    minWidth: 36,
    height: 36,
    borderRadius: 999,
    display: "inline-flex",
    justifyContent: "center",
    alignItems: "center",
    fontWeight: 900,
    boxShadow: "0 0 24px rgba(252,91,0,0.22)",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginBottom: 18,
  },

  input: {
    padding: 14,
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
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
    borderRadius: 14,
    cursor: "pointer",
    fontWeight: "bold",
    boxShadow: "0 0 22px rgba(252,91,0,0.28)",
  },

  secondaryButton: {
    background: "#111111",
    color: "#ffffff",
    border: "1px solid rgba(255,255,255,0.12)",
    padding: "10px 14px",
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 13,
  },

  message: {
    color: "#FC5B00",
    fontWeight: 700,
    marginTop: 14,
  },

  viewModeBox: {
    marginTop: 10,
    marginBottom: 18,
    padding: 16,
    borderRadius: 16,
    background: "#111111",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 14,
    alignItems: "center",
  },

  shareBox: {
    marginTop: 10,
    marginBottom: 18,
    padding: 16,
    borderRadius: 16,
    background: "#111111",
    border: "1px solid rgba(252,91,0,0.24)",
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
    border: "1px solid rgba(255,255,255,0.12)",
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

  progressBarBackground: {
    width: "100%",
    height: 12,
    background: "rgba(255,255,255,0.09)",
    borderRadius: 999,
    overflow: "hidden",
    marginTop: 8,
  },

  progressBarFill: {
    height: "100%",
    borderRadius: 999,
    transition: "all 0.4s ease",
  },

  disclaimer: {
    marginTop: 14,
    color: "#9CA3AF",
    fontSize: 12,
    lineHeight: 1.5,
  },

record: {
  display: "flex",
  flexDirection: "column",
  gap: 14,
  padding: 20,
  border: "1px solid rgba(252,91,0,0.14)",
  borderRadius: 18,
  marginBottom: 14,
  background:
    "linear-gradient(180deg, rgba(14,14,14,0.98), rgba(8,8,8,0.98))",
  boxShadow: "0 10px 28px rgba(0,0,0,0.32)",
},

  recordTop: {
    display: "flex",
    justifyContent: "space-between",
    gap: 16,
  },

  recordTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },

  recordTitle: {
    fontSize: 18,
    letterSpacing: "-0.02em",
  },

  urgencyText: {
    margin: "8px 0 0",
    color: "#FC5B00",
    fontSize: 13,
    fontWeight: 800,
  },

  recordMeta: {
    color: "#9CA3AF",
    fontSize: 13,
    margin: "8px 0 0",
  },

  recordDetailsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
    gap: 10,
  },

  detailCard: {
    background: "#0d0d0d",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: 14,
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },

  inlineActions: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "flex-end",
    padding: 14,
    borderRadius: 16,
    background: "rgba(252,91,0,0.06)",
    border: "1px solid rgba(252,91,0,0.18)",
  },

  dateField: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    maxWidth: 400,
    flex: 1,
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
    borderRadius: 12,
    border: "1px solid rgba(252,91,0,0.18)",
    background: "#0d0d0d",
  },

  previewText: {
    margin: "2px 0",
    fontSize: 12,
    color: "#FC5B00",
  },

  toggleButton: {
    border: "none",
    padding: "10px 14px",
    borderRadius: 10,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: "bold",
  },

  miniToggleButton: {
    border: "none",
    padding: "7px 10px",
    borderRadius: 999,
    color: "#ffffff",
    cursor: "pointer",
    fontSize: 11,
    fontWeight: "bold",
    width: "fit-content",
  },

  badge: {
    height: "fit-content",
    color: "#ffffff",
    padding: "7px 12px",
    borderRadius: 999,
    fontSize: 12,
    whiteSpace: "nowrap",
    fontWeight: 800,
  },

  requiredPill: {
    display: "inline-block",
    width: "fit-content",
    background: "#1f1f1f",
    color: "#FC5B00",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
    border: "1px solid #FC5B00",
  },

  artistPill: {
    display: "inline-block",
    width: "fit-content",
    background: "#182018",
    color: "#A7F3D0",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
    border: "1px solid rgba(34,197,94,0.22)",
  },

  shopPill: {
    display: "inline-block",
    width: "fit-content",
    background: "#2a1606",
    color: "#FDBA74",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
    border: "1px solid #FC5B00",
  },

  bothPill: {
    display: "inline-block",
    width: "fit-content",
    background: "#211306",
    color: "#FFD7B0",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
    border: "1px solid rgba(252,91,0,0.4)",
  },

  descriptionText: {
    color: "#D1D5DB",
    fontSize: 13,
    lineHeight: 1.55,
    maxWidth: 850,
    margin: 0,
  },

  sourceLink: {
    color: "#FC5B00",
    fontSize: 13,
    fontWeight: "bold",
    textDecoration: "none",
  },

  actionLink: {
    color: "#FC5B00",
    fontSize: 13,
    fontWeight: "bold",
    textDecoration: "none",
  },

  linkRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: 14,
  },

  badgeRow: {
    display: "flex",
    gap: 6,
    marginTop: 10,
    flexWrap: "wrap",
  },

  verifiedBadge: {
    background: "#0f2a1b",
    color: "#4ADE80",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
    fontWeight: "bold",
  },

  levelBadge: {
    background: "#1f2937",
    color: "#CBD5E1",
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 11,
  },

  compactDocumentBox: {
    marginTop: 2,
    padding: 14,
    borderRadius: 16,
    background: "#0d0d0d",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    flexWrap: "wrap",
  },

  vaultSearchRow: {
    marginBottom: 16,
  },

  documentVaultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
    gap: 14,
  },

  vaultItem: {
    padding: 16,
    borderRadius: 16,
    background: "#0d0d0d",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  documentBox: {
    marginTop: 2,
    padding: 16,
    borderRadius: 16,
    background: "#0d0d0d",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  documentHeader: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    flexWrap: "wrap",
    marginBottom: 12,
  },

  documentDate: {
    color: "#FC5B00",
    fontSize: 12,
    fontWeight: 800,
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
    borderRadius: 12,
    cursor: "pointer",
    fontWeight: "bold",
    fontSize: 13,
  },

  documentMeta: {
    color: "#9CA3AF",
    fontSize: 12,
    margin: "6px 0 0",
  },

  historyBox: {
    marginTop: 14,
    paddingTop: 12,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  },

  historyItem: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    background: "#111111",
    border: "1px solid rgba(255,255,255,0.08)",
  },

  emptyState: {
    display: "flex",
    gap: 14,
    alignItems: "center",
    padding: 18,
    borderRadius: 16,
    background: "rgba(252,91,0,0.06)",
    border: "1px dashed rgba(252,91,0,0.28)",
    color: "#D1D5DB",
  },

  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    background: "#FC5B00",
    color: "#ffffff",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    fontSize: 11,
    fontWeight: 900,
    flexShrink: 0,
  },

  activityList: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },

  activityItem: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    padding: 14,
    borderRadius: 14,
    background: "#111111",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "#D1D5DB",
  },

  activityDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    background: "#FC5B00",
    marginTop: 5,
    flexShrink: 0,
  },
};
"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
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
    profession_types?: string[] | null;
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

type ComplianceLogType = {
  id: number;
  key: string;
  name: string;
  description: string;
  frequency: string;
  requirement_owner: string;
};

type ComplianceLogEntry = {
  id: number;
  log_type_key: string;
  entry_date: string;
  result: string | null;
  notes: string | null;
  fields: Record<string, any>;
  machine_id?: string | null;
  service_performed?: string | null;
  technician_vendor?: string | null;
  archived?: boolean;
};

type StateOption = {
  value: string;
  label: string;
};

type ViewMode = "artist" | "shop" | "both";
type ProfessionType =
  | "tattoo_artist"
  | "piercer"
  | "shop";
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
  ID: "Idaho",
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
  NM: "New Mexico",
  NV: "Nevada",
  Nevada: "Nevada",
  NY: "New York",
  "New York": "New York",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  Oregon: "Oregon",
  PA: "Pennsylvania",
  Pennsylvania: "Pennsylvania",
  SC: "South Carolina",
  TN: "Tennessee",
  TX: "Texas",
  Texas: "Texas",
  UT: "Utah",
  VA: "Virginia",
  WA: "Washington",
  Washington: "Washington",
};

function downloadCsv(filename: string, rows: Record<string, string | number | null | undefined>[]) {
  if (!rows.length) return;

  const headers = Object.keys(rows[0]);

  const escapeCsvValue = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "";
    const stringValue = String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((header) => escapeCsvValue(row[header])).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

function formatDateForInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatStateLabel(stateCode: string) {
  return stateNameMap[stateCode] || stateCode;
}
function getRecordSpecificity(record: UserComplianceRecord) {
  const item = record.compliance_items as any;

  if (record.location_county || item?.county) return 3;
  if (record.location_state || item?.state) return 2;
  return 1;
}

function applyRequirementRecordOverrides(records: UserComplianceRecord[]) {
  const requirementMap = new Map<string, UserComplianceRecord>();

  for (const record of records) {
    const key = getDisplayRequirementName(record).trim().toLowerCase();
    const existing = requirementMap.get(key);

    if (!existing) {
      requirementMap.set(key, record);
      continue;
    }

    if (getRecordSpecificity(record) > getRecordSpecificity(existing)) {
      requirementMap.set(key, record);
      continue;
    }

    if (
      getRecordSpecificity(record) === getRecordSpecificity(existing) &&
      record.id > existing.id
    ) {
      requirementMap.set(key, record);
    }
  }

  return Array.from(requirementMap.values());
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
  const router = useRouter();
const supabase = createClient();
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [records, setRecords] = useState<UserComplianceRecord[]>([]);
  const [stateOptions, setStateOptions] = useState<StateOption[]>([]);
  const [countyOptions, setCountyOptions] = useState<string[]>([]);
  const [state, setState] = useState("");
  const [county, setCounty] = useState("");
  const [message, setMessage] = useState("");
  const [locationsReady, setLocationsReady] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("artist");
  const [professionType, setProfessionType] =
  useState<ProfessionType>("tattoo_artist");
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
const [archivedLogsOpen, setArchivedLogsOpen] = useState(false);

const [archivedSearch, setArchivedSearch] =
  useState("");

const [logTypes, setLogTypes] =
  useState<ComplianceLogType[]>([]);

const [logEntries, setLogEntries] =
  useState<ComplianceLogEntry[]>([]);

const [showLogs, setShowLogs] =
  useState(true);
const [activeLogKey, setActiveLogKey] = useState<string | null>(null);
const [openLogHistory, setOpenLogHistory] =
  useState<string | null>(null);
const [logExportStartDate, setLogExportStartDate] = useState("");
const [reportDisplayName, setReportDisplayName] = useState("");
const [logExportEndDate, setLogExportEndDate] = useState("");
const [sporeTestForm, setSporeTestForm] = useState({
  entry_date: "",
  result: "pass",
  lab_or_incubator: "",
  lot_number: "",
  notes: "",
});
const [autoclaveForm, setAutoclaveForm] = useState({
  entry_date: "",
  machine_id: "",
  service_performed: "",
  technician_vendor: "",
  notes: "",
});
const [sharpsForm, setSharpsForm] = useState({
  entry_date: "",
  vendor: "",
  manifest_number: "",
  container_count: "",
  notes: "",
});
const [exposureForm, setExposureForm] = useState({
  entry_date: "",
  incident_type: "",
  individuals_involved: "",
  immediate_actions: "",
  medical_follow_up_required: "no",
  outcome_resolution: "",
  notes: "",
});
const [sterilizationCycleForm, setSterilizationCycleForm] = useState({
  entry_date: "",
  load_number: "",
  autoclave_used: "",
  operator: "",
  cycle_result: "pass",
  notes: "",
});
const [jewelrySterilizationForm, setJewelrySterilizationForm] = useState({
  entry_date: "",
  jewelry_batch: "",
  material: "",
  method: "",
  operator: "",
  result: "pass",
  notes: "",
});
const [inspectionChecklistForm, setInspectionChecklistForm] = useState({
  entry_date: "",
  employee_initials: "",
  licenses_posted: false,
  bbp_current: false,
  consent_forms_available: false,
  aftercare_available: false,
  sharps_compliant: false,
  spore_tests_current: false,
  autoclave_records_available: false,
  biohazard_records_available: false,
  required_signage_posted: false,
  handwashing_sink_compliant: false,
  notes: "",
});
const [isAllianceMember, setIsAllianceMember] =
  useState(false);

const [profileLoaded, setProfileLoaded] =
  useState(false);

const COMPLIANCE_STATE_KEY = "apa_compliance_state";
const COMPLIANCE_COUNTY_KEY = "apa_compliance_county";

const userId = 1;
const [authUserId, setAuthUserId] = useState<string | null>(null);

useEffect(() => {
  async function checkAuth() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.replace("/login");
    }
  }

  checkAuth();
}, [router, supabase]);

function exportComplianceLogsCsv(logKey?: string) {
const logsToExport = logEntries.filter((entry) => {
  if (logKey && entry.log_type_key !== logKey) return false;

  if (logExportStartDate && entry.entry_date < logExportStartDate) {
    return false;
  }

  if (logExportEndDate && entry.entry_date > logExportEndDate) {
    return false;
  }

  return true;
});

if (!logsToExport.length) {
  alert("No compliance log entries match this export date range.");
  setMessage("No compliance log entries match this export date range.");
  return;
} 

  const rows = logsToExport.map((entry) => {
    const logType = logTypes.find((log) => log.key === entry.log_type_key);

    return {
      "Log Type": logType?.name || entry.log_type_key,
      "Entry Date": entry.entry_date,
      Result: entry.result || "",
      Notes: entry.notes || "",
      "Machine ID": entry.machine_id || "",
      "Service Performed": entry.service_performed || "",
      "Technician / Vendor": entry.technician_vendor || "",
      Fields: entry.fields
  ? Object.entries(entry.fields)
      .map(([key, value]) => {
        const label = key
          .replaceAll("_", " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return `${label}: ${value ?? ""}`;
      })
      .join(" | ")
  : "",
    };
  });

  const fileLabel = logKey ? logKey.replaceAll("_", "-") : "all-compliance-logs";

  downloadCsv(`apa-${fileLabel}-export.csv`, rows);
  setMessage("Compliance log CSV export downloaded.");
}
function exportComplianceLogsPdf(logKey?: string) {
  const logsToExport = logEntries.filter((entry) => {
        if (logKey && entry.log_type_key !== logKey) return false;

    if (logExportStartDate && entry.entry_date < logExportStartDate) {
      return false;
    }

    if (logExportEndDate && entry.entry_date > logExportEndDate) {
      return false;
    }

    return true;
  });

  if (!logsToExport.length) {
    alert("No compliance log entries match this export date range.");
    setMessage("No compliance log entries match this export date range.");
    return;
  }

  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("Please allow pop-ups to export the audit PDF.");
    return;
  }

  const groupedLogs = logTypes
    .map((log) => ({
      log,
      entries: logsToExport.filter(
        (entry) => entry.log_type_key === log.key
      ),
    }))
    .filter((group) => group.entries.length > 0);

    const totalEntries = logsToExport.length;

const summaryHtml = groupedLogs
  .map(
    (group) => `
      <tr>
        <td>${group.log.name}</td>
        <td>${group.entries.length}</td>
      </tr>
    `
  )
  .join("");

  const dateRangeLabel =
    logExportStartDate || logExportEndDate
      ? `${logExportStartDate || "Beginning"} to ${
          logExportEndDate || "Today"
        }`
      : "All dates";

  const generatedDate = new Date().toLocaleString();
  const reportStateLabel = state ? formatStateLabel(state) : "Not selected";
  const reportCountyLabel = county || "Not selected";

  const formatFieldsForReport = (fields: Record<string, any> | null) => {
    if (!fields) return "";

    return Object.entries(fields)
      .map(([key, value]) => {
        const label = key
          .replaceAll("_", " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return `${label}: ${value ?? ""}`;
      })
      .join(" | ");
  };

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  reportWindow.document.write(`
    <html>
      <head>
        <title>Compliance Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 32px;
          }

          h1 {
            color: #FC5B00;
            margin-bottom: 4px;
          }

          h2 {
            border-bottom: 2px solid #FC5B00;
            padding-bottom: 6px;
            margin-top: 32px;
          }

          .meta {
            margin-bottom: 24px;
            color: #444;
            font-size: 14px;
          }

          .entry {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }

          .label {
            font-weight: bold;
          }

          .small {
            font-size: 13px;
            color: #555;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <button onclick="window.print()">Save / Print PDF</button>

        <h1>Compliance Report</h1>

        <div
  style="
    color:#666;
    font-size:14px;
    margin-bottom:16px;
  "
>
  Generated by Artist Protection Alliance
</div>

        <div class="meta">
          <div><span class="label">Prepared For:</span> ${escapeHtml(reportDisplayName || "Compliance User")}</div>
          <div><span class="label">State:</span> ${escapeHtml(reportStateLabel)}</div>
          <div><span class="label">County:</span> ${escapeHtml(reportCountyLabel)}</div>
          <div><span class="label">Generated:</span> ${escapeHtml(generatedDate)}</div>
          <div><span class="label">Date Range:</span> ${escapeHtml(dateRangeLabel)}</div>
        </div>
        <h2>Audit Summary</h2>

<div class="entry">
  <div>
    <span class="label">Total Log Entries:</span>
    ${totalEntries}
  </div>

  <div style="margin-top:10px;">
    <table
      style="
        width:100%;
        border-collapse:collapse;
      "
    >
      <thead>
        <tr>
          <th
            style="
              text-align:left;
              border-bottom:1px solid #ddd;
              padding:6px;
            "
          >
            Log Type
          </th>

          <th
            style="
              text-align:left;
              border-bottom:1px solid #ddd;
              padding:6px;
            "
          >
            Entries
          </th>
        </tr>
      </thead>

      <tbody>
        ${summaryHtml}
      </tbody>
    </table>
  </div>
</div>

        ${groupedLogs
          .map(
            (group) => `
              <h2>${escapeHtml(group.log.name)}</h2>

              ${group.entries
                .map(
                  (entry) => `
                    <div class="entry">
                      <div><span class="label">Entry Date:</span> ${escapeHtml(entry.entry_date || "")}</div>
                      <div><span class="label">Result:</span> ${escapeHtml(entry.result || "")}</div>
                      <div><span class="label">Machine ID:</span> ${escapeHtml(entry.machine_id || "")}</div>
                      <div><span class="label">Service Performed:</span> ${escapeHtml(entry.service_performed || "")}</div>
                      <div><span class="label">Technician / Vendor:</span> ${escapeHtml(entry.technician_vendor || "")}</div>
                      <div><span class="label">Notes:</span> ${escapeHtml(entry.notes || "")}</div>
                      <div class="small">${escapeHtml(formatFieldsForReport(entry.fields))}</div>
                    </div>
                  `
                )
                .join("")}
            `
          )
          .join("")}
      </body>
    </html>
  `);

  reportWindow.document.close();
  setMessage("Compliance audit PDF report opened.");
}
useEffect(() => {
  hydrateProfile();
  loadLocationOptions();
  loadSharingPreference();
}, []);

function exportRequirementsPdf() {
  const recordsToExport = visibleRequirementRecords;

  if (!recordsToExport.length) {
    alert("No compliance requirement records are available to export.");
    setMessage("No compliance requirement records are available to export.");
    return;
  }

  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("Please allow pop-ups to export the requirements PDF.");
    return;
  }

  const generatedDate = new Date().toLocaleString();
  const reportStateLabel = state ? formatStateLabel(state) : "Not selected";
  const reportCountyLabel = county || "Not selected";

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  reportWindow.document.write(`
    <html>
      <head>
        <title>Compliance Requirements Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 32px;
          }

          h1 {
            color: #FC5B00;
            margin-bottom: 4px;
          }

          h2 {
            border-bottom: 2px solid #FC5B00;
            padding-bottom: 6px;
            margin-top: 32px;
          }

          .meta {
            margin-bottom: 24px;
            color: #444;
            font-size: 14px;
          }

          .entry {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }

          .label {
            font-weight: bold;
          }

          .small {
            font-size: 13px;
            color: #555;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <button onclick="window.print()">Save / Print PDF</button>

        <h1>Compliance Requirements Report</h1>

        <div style="color:#666;font-size:14px;margin-bottom:16px;">
          Generated by Artist Protection Alliance
        </div>

        <div class="meta">
          <div><span class="label">Prepared For:</span> ${escapeHtml(reportDisplayName || "Compliance User")}</div>
          <div><span class="label">State:</span> ${escapeHtml(reportStateLabel)}</div>
          <div><span class="label">County:</span> ${escapeHtml(reportCountyLabel)}</div>
          <div><span class="label">Generated:</span> ${escapeHtml(generatedDate)}</div>
        </div>

        <h2>Requirement Summary</h2>

        <div class="entry">
          <div><span class="label">Total Requirements:</span> ${recordsToExport.length}</div>
          <div><span class="label">Current:</span> ${
            recordsToExport.filter((record) => getStatus(record.expires_date) === "Active").length
          }</div>
          <div><span class="label">Needs Action:</span> ${
            recordsToExport.filter((record) => getStatus(record.expires_date) !== "Active").length
          }</div>
        </div>

        <h2>Requirement Records</h2>

        ${recordsToExport
          .map(
            (record) => `
              <div class="entry">
                <div><span class="label">Requirement:</span> ${escapeHtml(getDisplayRequirementName(record))}</div>
                <div><span class="label">Category:</span> ${escapeHtml(getDisplayRequirementCategory(record))}</div>
                <div><span class="label">Status:</span> ${escapeHtml(getStatus(record.expires_date))}</div>
                <div><span class="label">Completed:</span> ${escapeHtml(record.completed_date || "Not completed")}</div>
                <div><span class="label">Expires:</span> ${escapeHtml(record.expires_date || "No expiration date")}</div>
                <div><span class="label">Document:</span> ${escapeHtml(record.document_name || "No document uploaded")}</div>
                <div class="small">${escapeHtml(record.compliance_items?.description || "")}</div>
              </div>
            `
          )
          .join("")}
      </body>
    </html>
  `);

  reportWindow.document.close();
  setMessage("Compliance requirements PDF report opened.");
}

function exportFullComplianceReportPdf() {
  const recordsToExport = visibleRequirementRecords;

  const logsToExport = logEntries.filter((entry) => {
    if (logExportStartDate && entry.entry_date < logExportStartDate) {
      return false;
    }

    if (logExportEndDate && entry.entry_date > logExportEndDate) {
      return false;
    }

    return true;
  });

  if (!recordsToExport.length && !logsToExport.length) {
    alert("No compliance records are available to export.");
    setMessage("No compliance records are available to export.");
    return;
  }

  const reportWindow = window.open("", "_blank");

  if (!reportWindow) {
    alert("Please allow pop-ups to export the full compliance report.");
    return;
  }

  const generatedDate = new Date().toLocaleString();
  const reportStateLabel = state ? formatStateLabel(state) : "Not selected";
  const reportCountyLabel = county || "Not selected";

  const dateRangeLabel =
    logExportStartDate || logExportEndDate
      ? `${logExportStartDate || "Beginning"} to ${
          logExportEndDate || "Today"
        }`
      : "All dates";

  const escapeHtml = (value: string) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");

  const formatFieldsForReport = (fields: Record<string, any> | null) => {
    if (!fields) return "";

    return Object.entries(fields)
      .map(([key, value]) => {
        const label = key
          .replaceAll("_", " ")
          .replace(/\b\w/g, (char) => char.toUpperCase());

        return `${label}: ${value ?? ""}`;
      })
      .join(" | ");
  };

  const groupedLogs = logTypes
    .map((log) => ({
      log,
      entries: logsToExport.filter(
        (entry) => entry.log_type_key === log.key
      ),
    }))
    .filter((group) => group.entries.length > 0);

  reportWindow.document.write(`
    <html>
      <head>
        <title>Full Compliance Report</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            color: #111;
            padding: 32px;
          }

          h1 {
            color: #FC5B00;
            margin-bottom: 4px;
          }

          h2 {
            border-bottom: 2px solid #FC5B00;
            padding-bottom: 6px;
            margin-top: 32px;
          }

          h3 {
            margin-top: 24px;
          }

          .meta {
            margin-bottom: 24px;
            color: #444;
            font-size: 14px;
          }

          .entry {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
            page-break-inside: avoid;
          }

          .label {
            font-weight: bold;
          }

          .small {
            font-size: 13px;
            color: #555;
          }

          @media print {
            button {
              display: none;
            }
          }
        </style>
      </head>

      <body>
        <button onclick="window.print()">Save / Print PDF</button>

        <h1>Full Compliance Report</h1>

        <div style="color:#666;font-size:14px;margin-bottom:16px;">
          Generated by Artist Protection Alliance
        </div>

        <div class="meta">
          <div><span class="label">Prepared For:</span> ${escapeHtml(reportDisplayName || "Compliance User")}</div>
          <div><span class="label">State:</span> ${escapeHtml(reportStateLabel)}</div>
          <div><span class="label">County:</span> ${escapeHtml(reportCountyLabel)}</div>
          <div><span class="label">Generated:</span> ${escapeHtml(generatedDate)}</div>
          <div><span class="label">Log Date Range:</span> ${escapeHtml(dateRangeLabel)}</div>
        </div>

        <h2>Requirement Summary</h2>

        <div class="entry">
          <div><span class="label">Total Requirements:</span> ${recordsToExport.length}</div>
          <div><span class="label">Current:</span> ${
            recordsToExport.filter((record) => getStatus(record.expires_date) === "Active").length
          }</div>
          <div><span class="label">Needs Action:</span> ${
            recordsToExport.filter((record) => getStatus(record.expires_date) !== "Active").length
          }</div>
        </div>

        <h2>Requirement Records</h2>

        ${recordsToExport
          .map(
            (record) => `
              <div class="entry">
                <div><span class="label">Requirement:</span> ${escapeHtml(getDisplayRequirementName(record))}</div>
                <div><span class="label">Category:</span> ${escapeHtml(getDisplayRequirementCategory(record))}</div>
                <div><span class="label">Status:</span> ${escapeHtml(getStatus(record.expires_date))}</div>
                <div><span class="label">Completed:</span> ${escapeHtml(record.completed_date || "Not completed")}</div>
                <div><span class="label">Expires:</span> ${escapeHtml(record.expires_date || "No expiration date")}</div>
                <div><span class="label">Document:</span> ${escapeHtml(record.document_name || "No document uploaded")}</div>
                <div class="small">${escapeHtml(record.compliance_items?.description || "")}</div>
              </div>
            `
          )
          .join("")}

        <h2>Compliance Log Summary</h2>

        <div class="entry">
          <div><span class="label">Total Log Entries:</span> ${logsToExport.length}</div>
          <div><span class="label">Date Range:</span> ${escapeHtml(dateRangeLabel)}</div>
        </div>

        <h2>Compliance Log Records</h2>

        ${groupedLogs
          .map(
            (group) => `
              <h3>${escapeHtml(group.log.name)}</h3>

              ${group.entries
                .map(
                  (entry) => `
                    <div class="entry">
                      <div><span class="label">Entry Date:</span> ${escapeHtml(entry.entry_date || "")}</div>
                      <div><span class="label">Result:</span> ${escapeHtml(entry.result || "")}</div>
                      <div><span class="label">Machine ID:</span> ${escapeHtml(entry.machine_id || "")}</div>
                      <div><span class="label">Service Performed:</span> ${escapeHtml(entry.service_performed || "")}</div>
                      <div><span class="label">Technician / Vendor:</span> ${escapeHtml(entry.technician_vendor || "")}</div>
                      <div><span class="label">Notes:</span> ${escapeHtml(entry.notes || "")}</div>
                      <div class="small">${escapeHtml(formatFieldsForReport(entry.fields))}</div>
                    </div>
                  `
                )
                .join("")}
            `
          )
          .join("")}
      </body>
    </html>
  `);

  reportWindow.document.close();
  setMessage("Full compliance report opened.");
}
<div style={styles.card}>
  <h2 style={styles.sectionTitle}>Archived Compliance Logs</h2>

  <p style={styles.helperText}>
    Archived logs are retained for audit history and can be restored at any time.
  </p>

  {logEntries.filter((entry) => entry.archived).length === 0 ? (
    <p style={styles.emptyText}>No archived compliance logs.</p>
  ) : (
    logTypes.map((log) => {
      const archivedEntries = logEntries.filter(
        (entry) => entry.log_type_key === log.key && entry.archived
      );

      const filteredArchivedEntries = archivedEntries.filter(
  (entry) => {
    const search = archivedSearch.toLowerCase();

    const logName =
      logTypes
        .find((log) => log.key === entry.log_type_key)
        ?.name?.toLowerCase() || "";

    return (
      logName.includes(search) ||
      entry.result?.toLowerCase().includes(search) ||
      entry.notes?.toLowerCase().includes(search) ||
      entry.entry_date?.includes(search)
    );
  }
);

      if (archivedEntries.length === 0) return null;

      return (
        <div key={`archived-${log.key}`} style={styles.logCard}>
          <h3 style={styles.logTitle}>{log.name}</h3>

          {archivedEntries.map((entry) => (
            <div key={entry.id} style={styles.historyItem}>
              <p>
                <strong>Date:</strong> {entry.entry_date || "Not recorded"}
              </p>

              {entry.result && (
                <p>
                  <strong>Result:</strong> {entry.result}
                </p>
              )}

              {entry.notes && (
                <p>
                  <strong>Notes:</strong> {entry.notes}
                </p>
              )}

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => restoreComplianceLogEntry(entry.id)}
              >
                Restore Log
              </button>
            </div>
          ))}
        </div>
      );
    })
  )}
</div>

useEffect(() => {
  if (!locationsReady || !state || !authUserId) return;
  autoPopulate();
}, [locationsReady, state, county, authUserId]);
async function hydrateProfile() {
  try {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error(
        "PROFILE HYDRATION AUTH ERROR:",
        authError
      );
      return;
    }

setAuthUserId(user.id);
setReportDisplayName(user.email || "Compliance User");

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("profession_type, membership_tier, artist_name, shop_name, email")
        .eq("id", user.id)
        .single();

    if (profileError) {
      console.error(
        "PROFILE HYDRATION PROFILE ERROR:",
        profileError
      );
      return;
    }

    const resolvedReportName =
  profile?.shop_name ||
  profile?.artist_name ||
  profile?.email ||
  user.email ||
  "Compliance User";

setReportDisplayName(resolvedReportName);

    if (
      profile?.profession_type === "piercer" ||
      profile?.profession_type === "shop" ||
      profile?.profession_type === "tattoo_artist"
    ) {
      setProfessionType(profile.profession_type);
    }
if (
  profile?.membership_tier === "alliance" ||
  profile?.membership_tier === "admin"
) {
  setIsAllianceMember(true);
}
    setProfileLoaded(true);
  } catch (error) {
    console.error(
      "PROFILE HYDRATION FAILED:",
      error
    );
  }
}
async function loadSharingPreference() {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  const { data } = await supabase
    .from("artist_profiles")
    .select("compliance_status_visible")
    .eq("user_id", user.id)
    .limit(1);

  setShareComplianceStatus(
    Boolean(data?.[0]?.compliance_status_visible)
  );
}
async function toggleShareComplianceStatus() {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    setMessage("You must be logged in to change sharing settings.");
    return;
  }

  const nextValue = !shareComplianceStatus;

  const { error } = await supabase
    .from("artist_profiles")
    .update({ compliance_status_visible: nextValue })
    .eq("user_id", user.id);

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

    const savedState =
      typeof window !== "undefined"
        ? window.localStorage.getItem(COMPLIANCE_STATE_KEY)
        : null;

    const savedCounty =
      typeof window !== "undefined"
        ? window.localStorage.getItem(COMPLIANCE_COUNTY_KEY)
        : null;

    const defaultState = uniqueStates.includes("AZ")
      ? "AZ"
      : uniqueStates[0] || "";

    const selectedState =
      savedState && uniqueStates.includes(savedState)
        ? savedState
        : defaultState;

    if (!selectedState) {
      setMessage("No active compliance locations found.");
      return;
    }

    const counties = await loadCountiesForState(selectedState);

    const selectedCounty =
      savedCounty && counties.includes(savedCounty)
        ? savedCounty
        : counties[0] || "";

    setState(selectedState);
    setCounty(selectedCounty);
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
  ? `state.is.null,and(state.eq.${state},county.is.null),and(state.eq.${state},county.eq.${county})`
  : `state.is.null,and(state.eq.${state},county.is.null)`;

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
          active,
          profession_types
        )
      `
      )
      .eq("auth_user_id", authUserId || "")
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
    const { data: logs } = await supabase
  .from("compliance_log_types")
  .select("*")
  .eq("active", true)
  .order("sort_order");

setLogTypes(logs || []);

if (authUserId) {
  const { data: entries } = await supabase
    .from("compliance_log_entries")
    .select("*")
    .eq("auth_user_id", authUserId)
    .order("entry_date", {
      ascending: false,
    });

  setLogEntries(entries || []);
}
  }

  
  async function autoPopulate() {
    setMessage("Loading required compliance...");

    if (!authUserId) {
  setMessage("Please log in to load compliance records.");
  return;
}

const { error } = await supabase.rpc(
  "auto_populate_user_compliance_public_bridge",
  {
    p_auth_user_id: authUserId,
    p_state: state,
    p_county: county,
  }
);

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

function recordMatchesProfession(
  record: UserComplianceRecord
) {
  const professionTypes =
    record.compliance_items?.profession_types;

  if (
    !professionTypes ||
    professionTypes.length === 0
  ) {
    return true;
  }

  if (professionType === "shop") {
    return true;
  }

  return professionTypes.includes(professionType);
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

    window.localStorage.setItem(COMPLIANCE_STATE_KEY, newState);
    window.localStorage.removeItem(COMPLIANCE_COUNTY_KEY);

    const counties = await loadCountiesForState(newState);
    const nextCounty = counties[0] || "";

    setCounty(nextCounty);

    if (nextCounty) {
      window.localStorage.setItem(COMPLIANCE_COUNTY_KEY, nextCounty);
    }

    setLocationsReady(true);
  }

   function handleCountyChange(newCounty: string) {
    setCounty(newCounty);
    setCompletionDates({});

    window.localStorage.setItem(COMPLIANCE_COUNTY_KEY, newCounty);
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
function getLogOwner(log: ComplianceLogType) {
  return log.requirement_owner || "both";
}

function shouldShowLogType(log: ComplianceLogType) {
  if (
    log.key === "jewelry_sterilization" &&
    professionType !== "piercer" &&
    professionType !== "shop"
  ) {
    return false;
  }

  if (
    log.key === "inspection_checklist" ||
    log.key === "exposure_incident"
  ) {
    return true;
  }

  if (professionType === "shop") {
    return true;
  }

  if (
    professionType === "tattoo_artist" ||
    professionType === "piercer"
  ) {
    return true;
  }

  return true;
}

function shouldCountTowardComplianceScore(record: UserComplianceRecord) {
  const name = getDisplayRequirementName(record).toLowerCase();
  const category = getDisplayRequirementCategory(record).toLowerCase();
  const description = (record.compliance_items?.description || "").toLowerCase();

  const combined = `${name} ${category} ${description}`;

  const ongoingKeywords = [
    "consent form",
    "consent forms",
    "minor consent",
    "minor consent form",
    "minor consent forms",
    "client consent",
    "client consent form",
    "client consent forms",
    "release form",
    "release forms",
    "aftercare",
    "aftercare documentation",
    "documentation system",
    "recordkeeping",
    "record keeping",
    "written procedure",
    "written procedures",
    "policy",
    "policies",
    "procedure",
    "procedures",
    "system",
    "systems",
    "oral piercing client advisory",
"oral piercing advisory",
"piercing aftercare documentation",
"piercing aftercare",
"piercing jewelry material compliance",
"jewelry material compliance",
"client consent forms",
"minor consent documentation",
"aftercare documentation",
"jewelry sterilization procedures",
  ];

  return !ongoingKeywords.some((keyword) => combined.includes(keyword));
}

// Hide unfinished county placeholder requirements from the UI only.
// DO NOT deactivate these in Supabase because they are currently used
// to populate the county dropdown.
function isCountyPlaceholderRequirement(record: UserComplianceRecord) {
  return (
    getDisplayRequirementName(record)
      .trim()
      .toLowerCase() ===
    "county-level tattoo compliance review"
  );
}


function isComplianceLogRequirement(record: UserComplianceRecord) {
  const name = getDisplayRequirementName(record).toLowerCase();
  const category = getDisplayRequirementCategory(record).toLowerCase();
  const description = (record.compliance_items?.description || "").toLowerCase();

  const combined = `${name} ${category} ${description}`;

if (
  combined.includes("bloodborne pathogens") ||
  combined.includes("bloodborne pathogen") ||
  combined.includes("blood borne") ||
  combined.includes("bbp")
) {
  return false;
}

  const logRequirementKeywords = [
    "spore test",
    "biological monitoring",
    "autoclave",
    "sterilization cycle",
    "sterilization log",
    "jewelry sterilization",
    "sharps disposal",
    "exposure incident",
    "incident log",
    "inspection readiness",
    "inspection checklist",
    "inspection readiness checklist",
  ];

  return logRequirementKeywords.some((keyword) =>
    combined.includes(keyword)
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
    recordMatchesProfession(record) &&
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

const visibleLogTypes = logTypes.filter((log) => shouldShowLogType(log));

const visibleRequirementRecords = applyRequirementRecordOverrides(
  visibleRecords.filter(
    (record) =>
      !isComplianceLogRequirement(record) &&
      !isCountyPlaceholderRequirement(record)
  )
);

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

  const artistRecords = visibleRequirementRecords.filter((r) => {
    const owner = getRequirementOwner(r);
    return owner === "artist" || owner === "both";
  });

  const shopRecords = visibleRequirementRecords.filter((r) => {
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

const applicableRecords = visibleRequirementRecords.filter(
  shouldCountTowardComplianceScore
);

const completedCount = applicableRecords.filter(
  (r) => r.completed_date && r.expires_date
).length;

const totalCount = applicableRecords.length;
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

const activityFeed = useMemo(() => {
  const requirementEvents = visibleRequirementRecords.flatMap((record) => {
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
  });

 const logEvents = logEntries
  .filter((entry) =>
    visibleLogTypes.some((log) => log.key === entry.log_type_key)
  )
  .map((entry) => {
    const logType = visibleLogTypes.find(
      (type) => type.key === entry.log_type_key
    );

    return {
      date: entry.entry_date,
      title: "Compliance log saved",
      detail: `${logType?.name || "Compliance log"} was recorded.`,
    };
  });

  return [...requirementEvents, ...logEvents]
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )
    .slice(0, 6);
}, [visibleRecords, logEntries, visibleLogTypes]);

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
      {isAllianceMember && (
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
 )}
                {editable && isAllianceMember && (
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
        {isAllianceMember && (
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
                {record.is_inapplicable ? "Marked N/A" : "Mark N/A"}
              </button>
            </div>
          </div>
        )}
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

          <p
  style={{
    ...styles.helperText,
    maxWidth: "980px",
    lineHeight: "1.5",
  }}
>
  Current and previously uploaded compliance documents. Replaced uploads are retained in document history for reference. Compliance log entries are managed separately in Compliance Logs.
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
  style={{
    ...styles.input,
    width: "100%",
  }}
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
            {vaultRecords
  .filter((record) => record.document_url)
  .map((record) => {
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
async function saveSporeTestLog() {
  if (!authUserId) {
    setMessage("You must be logged in to save a compliance log.");
    return;
  }

  if (!sporeTestForm.entry_date) {
    setMessage("Please enter the spore test date.");
    return;
  }

  const { error } = await supabase
    .from("compliance_log_entries")
    .insert({
      auth_user_id: authUserId,
      log_type_key: "spore_test",
      entry_date: sporeTestForm.entry_date,
      result: sporeTestForm.result,
      fields: {
        lab_or_incubator: sporeTestForm.lab_or_incubator,
        lot_number: sporeTestForm.lot_number,
      },
      notes: sporeTestForm.notes,
    });

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Spore test log saved.");
  setActiveLogKey(null);
  setSporeTestForm({
    entry_date: "",
    result: "pass",
    lab_or_incubator: "",
    lot_number: "",
    notes: "",
  });

  loadData();
}
async function saveInspectionChecklist() {
  if (!authUserId) {
    setMessage("You must be logged in to save a compliance log.");
    return;
  }

  if (!inspectionChecklistForm.entry_date) {
    setMessage("Please enter the inspection date.");
    return;
  }

  const { error } = await supabase
    .from("compliance_log_entries")
    .insert({
      auth_user_id: authUserId,
      log_type_key: "inspection_checklist",
      entry_date: inspectionChecklistForm.entry_date,
      fields: {
        employee_initials:
          inspectionChecklistForm.employee_initials,
        licenses_posted:
          inspectionChecklistForm.licenses_posted,
        bbp_current:
          inspectionChecklistForm.bbp_current,
        consent_forms_available:
          inspectionChecklistForm.consent_forms_available,
        aftercare_available:
          inspectionChecklistForm.aftercare_available,
        sharps_compliant:
          inspectionChecklistForm.sharps_compliant,
        spore_tests_current:
          inspectionChecklistForm.spore_tests_current,
        autoclave_records_available:
          inspectionChecklistForm.autoclave_records_available,
        biohazard_records_available:
          inspectionChecklistForm.biohazard_records_available,
        required_signage_posted:
          inspectionChecklistForm.required_signage_posted,
        handwashing_sink_compliant:
          inspectionChecklistForm.handwashing_sink_compliant,
      },
      notes: inspectionChecklistForm.notes,
    });

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Inspection checklist saved.");
  setActiveLogKey(null);

  setInspectionChecklistForm({
    entry_date: "",
    employee_initials: "",
    licenses_posted: false,
    bbp_current: false,
    consent_forms_available: false,
    aftercare_available: false,
    sharps_compliant: false,
    spore_tests_current: false,
    autoclave_records_available: false,
    biohazard_records_available: false,
    required_signage_posted: false,
    handwashing_sink_compliant: false,
    notes: "",
  });

  await loadData();
}
async function archiveComplianceLogEntry(entryId: number) {
  const { error } = await supabase
    .from("compliance_log_entries")
    .update({ archived: true })
    .eq("id", entryId);

  if (error) {
    setMessage(error.message);
    return;
  }

  setMessage("Compliance log entry archived.");
  loadData();
}
async function restoreComplianceLogEntry(entryId: number) {
  const { error } = await supabase
    .from("compliance_log_entries")
    .update({ archived: false })
    .eq("id", entryId);

  if (error) {
    setMessage(error.message);
    return;
  }

  setLogEntries((prev) =>
    prev.map((entry) =>
      entry.id === entryId ? { ...entry, archived: false } : entry
    )
  );

  setMessage("Archived log restored.");
}
async function saveAutoclaveLog() {
  if (!authUserId) {
    setMessage("You must be logged in to save a compliance log.");
    return;
  }

  if (!autoclaveForm.entry_date) {
    setMessage("Please enter the service date.");
    return;
  }

  const { error } = await supabase
    .from("compliance_log_entries")
    .insert({
      auth_user_id: authUserId,
      log_type_key: "autoclave_maintenance",
      entry_date: autoclaveForm.entry_date,
      fields: {
        machine_id: autoclaveForm.machine_id,
        service_performed: autoclaveForm.service_performed,
        technician_vendor: autoclaveForm.technician_vendor,
      },
      notes: autoclaveForm.notes,
    });

  if (error) {
    setMessage(error.message || "Could not save autoclave log.");
    console.error("Error saving autoclave log:", error);
    return;
  }

  setMessage("Autoclave maintenance log saved.");
  setActiveLogKey(null);

  setAutoclaveForm({
    entry_date: "",
    machine_id: "",
    service_performed: "",
    technician_vendor: "",
    notes: "",
  });

  loadData();
}
async function saveSharpsDisposalLog() {
  if (!authUserId) {
    setMessage("You must be logged in to save a compliance log.");
    return;
  }

  if (!sharpsForm.entry_date) {
    setMessage("Please enter the pickup date.");
    return;
  }

  const { error } = await supabase
    .from("compliance_log_entries")
    .insert({
      auth_user_id: authUserId,
      log_type_key: "sharps_disposal",
      entry_date: sharpsForm.entry_date,
      fields: {
        vendor: sharpsForm.vendor,
        manifest_number: sharpsForm.manifest_number,
        container_count: sharpsForm.container_count,
      },
      notes: sharpsForm.notes,
    });

  if (error) {
    setMessage(error.message || "Could not save sharps disposal log.");
    console.error("Error saving sharps disposal log:", error);
    return;
  }

  setMessage("Sharps disposal log saved.");
  setActiveLogKey(null);

  setSharpsForm({
    entry_date: "",
    vendor: "",
    manifest_number: "",
    container_count: "",
    notes: "",
  });

  loadData();
}
async function saveExposureIncidentLog() {
  if (!authUserId) {
    setMessage("You must be logged in to save a compliance log.");
    return;
  }

  if (!exposureForm.entry_date) {
    setMessage("Please enter the incident date.");
    return;
  }

  const { error } = await supabase
    .from("compliance_log_entries")
    .insert({
      auth_user_id: authUserId,
      log_type_key: "exposure_incident",
      entry_date: exposureForm.entry_date,
      fields: {
        incident_type: exposureForm.incident_type,
        individuals_involved: exposureForm.individuals_involved,
        immediate_actions: exposureForm.immediate_actions,
        medical_follow_up_required:
          exposureForm.medical_follow_up_required,
        outcome_resolution: exposureForm.outcome_resolution,
      },
      notes: exposureForm.notes,
    });

  if (error) {
    setMessage(error.message || "Could not save exposure incident log.");
    console.error("Error saving exposure incident log:", error);
    return;
  }

  setMessage("Exposure incident log saved.");
  setActiveLogKey(null);

  setExposureForm({
    entry_date: "",
    incident_type: "",
    individuals_involved: "",
    immediate_actions: "",
    medical_follow_up_required: "no",
    outcome_resolution: "",
    notes: "",
  });

  loadData();
}
async function saveSterilizationCycleLog() {
  if (!authUserId) {
    setMessage("You must be logged in to save a compliance log.");
    return;
  }

  if (!sterilizationCycleForm.entry_date) {
    setMessage("Please enter the cycle date.");
    return;
  }

  const { error } = await supabase
    .from("compliance_log_entries")
    .insert({
      auth_user_id: authUserId,
      log_type_key: "sterilization_cycle",
      entry_date: sterilizationCycleForm.entry_date,
      result: sterilizationCycleForm.cycle_result,
      fields: {
        load_number: sterilizationCycleForm.load_number,
        autoclave_used: sterilizationCycleForm.autoclave_used,
        operator: sterilizationCycleForm.operator,
      },
      notes: sterilizationCycleForm.notes,
    });

  if (error) {
    setMessage(error.message || "Could not save sterilization cycle log.");
    console.error("Error saving sterilization cycle log:", error);
    return;
  }

  setMessage("Sterilization cycle log saved.");
  setActiveLogKey(null);

  setSterilizationCycleForm({
    entry_date: "",
    load_number: "",
    autoclave_used: "",
    operator: "",
    cycle_result: "pass",
    notes: "",
  });

  loadData();
}
async function saveJewelrySterilizationLog() {
  if (!authUserId) {
    setMessage("You must be logged in to save a compliance log.");
    return;
  }

  if (!jewelrySterilizationForm.entry_date) {
    setMessage("Please enter the sterilization date.");
    return;
  }

  const { error } = await supabase
    .from("compliance_log_entries")
    .insert({
      auth_user_id: authUserId,
      log_type_key: "jewelry_sterilization",
      entry_date: jewelrySterilizationForm.entry_date,
      result: jewelrySterilizationForm.result,
      fields: {
        jewelry_batch: jewelrySterilizationForm.jewelry_batch,
        material: jewelrySterilizationForm.material,
        method: jewelrySterilizationForm.method,
        operator: jewelrySterilizationForm.operator,
      },
      notes: jewelrySterilizationForm.notes,
    });

  if (error) {
    setMessage(error.message || "Could not save jewelry sterilization log.");
    console.error("Error saving jewelry sterilization log:", error);
    return;
  }

  setMessage("Jewelry sterilization log saved.");
  setActiveLogKey(null);

  setJewelrySterilizationForm({
    entry_date: "",
    jewelry_batch: "",
    material: "",
    method: "",
    operator: "",
    result: "pass",
    notes: "",
  });

  loadData();
}
function renderComplianceLogs() {
  return (
    <section style={styles.card}>
      <div style={styles.sectionHeader}>
        <div>
          <p style={styles.eyebrow}>Alliance Compliance Operations</p>
          <h2 style={styles.sectionTitle}>
            Compliance Logs
          </h2>

          <p style={styles.helperText}>
            Logs are operational records for sterilization, testing, inspections, and safety activity. They do not replace required compliance items, permits, licenses, inspections, or uploaded compliance documents.
          </p>

<div
  style={{
    display: "flex",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "12px",
  }}
>
  <div>
    <label style={styles.inputLabel}>
      Export Start Date
    </label>

    <input
      type="date"
      style={styles.input}
      value={logExportStartDate}
      onChange={(e) =>
        setLogExportStartDate(e.target.value)
      }
    />
  </div>

  <div>
    <label style={styles.inputLabel}>
      Export End Date
    </label>

    <input
      type="date"
      style={styles.input}
      value={logExportEndDate}
      onChange={(e) =>
        setLogExportEndDate(e.target.value)
      }
    />
  </div>
</div>
<div
  style={{
    display: "flex",
    alignItems: "flex-end",
  }}
>
  <button
    type="button"
    style={styles.secondaryButton}
    onClick={() => {
      setLogExportStartDate("");
      setLogExportEndDate("");
    }}
  >
    Clear Dates
  </button>
</div>
<div
  style={{
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    flexWrap: "wrap",
  }}
>
  <button
    type="button"
    style={styles.secondaryButton}
    onClick={() => {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 30);

      setLogExportStartDate(formatDateForInput(start));
      setLogExportEndDate(formatDateForInput(today));
    }}
  >
    Last 30 Days
  </button>

  <button
    type="button"
    style={styles.secondaryButton}
    onClick={() => {
      const today = new Date();
      const start = new Date();
      start.setDate(today.getDate() - 90);

      setLogExportStartDate(formatDateForInput(start));
      setLogExportEndDate(formatDateForInput(today));
    }}
  >
    Last 90 Days
  </button>

  <button
    type="button"
    style={styles.secondaryButton}
    onClick={() => {
      const today = new Date();
      const start = new Date();
      start.setFullYear(today.getFullYear() - 1);

      setLogExportStartDate(formatDateForInput(start));
      setLogExportEndDate(formatDateForInput(today));
    }}
  >
    Last 12 Months
  </button>
</div>
</div>

                <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
          }}
        >
<button
  type="button"
  style={styles.secondaryButton}
  onClick={() => exportComplianceLogsCsv()}
>
  Export All Logs CSV
</button>

<button
  type="button"
  style={styles.secondaryButton}
  onClick={() => exportComplianceLogsPdf()}
>
  Export All Logs PDF
</button>

          <span style={styles.sectionCount}>
            {visibleLogTypes.length}
          </span>
        </div>
      </div>

      {visibleLogTypes.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>APA</div>

          <div>
            <strong>No logs available.</strong>

            <p>
              No compliance log templates have been
              configured yet.
            </p>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gap: "16px",
        }}
      >
        {visibleLogTypes.map((log) => {
          const latestEntry = logEntries.find(
            (entry) =>
              entry.log_type_key === log.key
          );

          return (
            <div
              key={log.id}
              style={{
                border:
                  "1px solid rgba(255,92,0,0.14)",
                borderRadius: "16px",
                padding: "18px",
                background:
                  "linear-gradient(180deg,#111,#0b0b0b)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: "12px",
                  flexWrap: "wrap",
                }}
              >
                <div>
                  <strong
  style={{
    fontSize: "20px",
    fontWeight: 700,
  }}
>
                    {log.name}
                  </strong>

                  <p
                    style={{
                      color: "#9CA3AF",
                      marginTop: "6px",
                      fontSize: "15px",
                      lineHeight: "1.5",
                    }}
                  >
                    {log.description}
                  </p>

                  <p
  style={{
    color: "#FC5B00",
    marginTop: "8px",
    fontSize: "14px",
    fontWeight: 600,
  }}
>
  Frequency:{" "}
  {log.frequency
    ?.replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())}
</p>
                </div>
<div
  style={{
    display: "flex",
    flexDirection: "column",
    alignItems: "stretch",
    gap: "8px",
    minWidth: "160px",
  }}
>
             <button
  type="button"
  style={{
  ...styles.button,
  minHeight: "36px",
  fontSize: "13px",
}}
  onClick={() => {
if (
  log.key === "spore_test" ||
  log.key === "autoclave_maintenance" ||
  log.key === "sharps_disposal" ||
  log.key === "exposure_incident" ||
  log.key === "sterilization_cycle" ||
  log.key === "jewelry_sterilization" ||
  log.key === "inspection_checklist"
) {
      setActiveLogKey(
        activeLogKey === log.key ? null : log.key
      );
      return;
    }

    alert(`${log.name} form coming next`);
  }}
>
  {(log.key === "spore_test" ||
  log.key === "autoclave_maintenance" ||
  log.key === "sharps_disposal" ||
  log.key === "exposure_incident" ||
  log.key === "sterilization_cycle" ||
  log.key === "jewelry_sterilization" ||
  log.key === "inspection_checklist") &&
activeLogKey === log.key
  ? "Close Form"
  : "Complete Log"}
</button>

<button
  type="button"
  style={{
  ...styles.secondaryButton,
  minHeight: "36px",
  fontSize: "13px",
}}
  onClick={() => exportComplianceLogsCsv(log.key)}
>
  Export CSV
</button>

<button
  type="button"
  style={styles.secondaryButton}
  onClick={() => exportComplianceLogsPdf(log.key)}
>
  Export PDF
</button>
<button
  type="button"
  style={styles.secondaryButton}
  onClick={() =>
    setOpenLogHistory(
      openLogHistory === log.key ? null : log.key
    )
  }
>
  {openLogHistory === log.key
    ? "Hide History"
    : "View History"}
</button>
</div>
              </div>

              <div
                style={{
    color: "#FFFFFF",
    marginTop: "14px",
    fontSize: "15px",
    fontWeight: 600,
  }}
>
                Last Entry:{" "}
                {latestEntry
                  ? latestEntry.entry_date
                  : "No entries yet"}
              </div>
              {log.key === "spore_test" && activeLogKey === "spore_test" && (
  <div style={styles.inlineActions}>
    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Test Date</label>
      <input
        type="date"
        style={styles.input}
        value={sporeTestForm.entry_date}
        onChange={(e) =>
          setSporeTestForm((prev) => ({
            ...prev,
            entry_date: e.target.value,
          }))
        }
      />
    </div>

    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Result</label>
     <select
  style={{
    ...styles.input,
    height: "50px",
    minHeight: "50px",
  }}
  value={sporeTestForm.result}
  onChange={(e) =>
    setSporeTestForm((prev) => ({
      ...prev,
      result: e.target.value,
    }))
  }
>
        <option value="pass">Pass</option>
        <option value="fail">Fail</option>
      </select>
    </div>

    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Lab / Incubator</label>
      <input
        style={styles.input}
        value={sporeTestForm.lab_or_incubator}
        onChange={(e) =>
          setSporeTestForm((prev) => ({
            ...prev,
            lab_or_incubator: e.target.value,
          }))
        }
      />
    </div>

    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Lot Number</label>
      <input
        style={styles.input}
        value={sporeTestForm.lot_number}
        onChange={(e) =>
          setSporeTestForm((prev) => ({
            ...prev,
            lot_number: e.target.value,
          }))
        }
      />
    </div>

    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Notes</label>
      <input
        style={styles.input}
        value={sporeTestForm.notes}
        onChange={(e) =>
          setSporeTestForm((prev) => ({
            ...prev,
            notes: e.target.value,
          }))
        }
      />
    </div>

    <button type="button" style={styles.button} onClick={saveSporeTestLog}>
      Save Spore Test
    </button>
  </div>
)}
{log.key === "inspection_checklist" && activeLogKey === "inspection_checklist" && (
  <div style={styles.inlineActions}>
    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Date Checked</label>
      <input
        type="date"
        style={styles.input}
        value={inspectionChecklistForm.entry_date}
        onChange={(e) =>
          setInspectionChecklistForm((prev) => ({
            ...prev,
            entry_date: e.target.value,
          }))
        }
      />
    </div>

    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Employee Initials</label>
      <input
        style={styles.input}
        value={inspectionChecklistForm.employee_initials}
        onChange={(e) =>
          setInspectionChecklistForm((prev) => ({
            ...prev,
            employee_initials: e.target.value,
          }))
        }
      />
    </div>

    <label><input type="checkbox" checked={inspectionChecklistForm.licenses_posted} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, licenses_posted: e.target.checked }))} /> Licenses posted</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.bbp_current} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, bbp_current: e.target.checked }))} /> BBP certificates current</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.consent_forms_available} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, consent_forms_available: e.target.checked }))} /> Consent forms available</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.aftercare_available} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, aftercare_available: e.target.checked }))} /> Aftercare instructions available</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.sharps_compliant} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, sharps_compliant: e.target.checked }))} /> Sharps containers compliant</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.spore_tests_current} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, spore_tests_current: e.target.checked }))} /> Spore tests current</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.autoclave_records_available} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, autoclave_records_available: e.target.checked }))} /> Autoclave records available</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.biohazard_records_available} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, biohazard_records_available: e.target.checked }))} /> Biohazard disposal records available</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.required_signage_posted} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, required_signage_posted: e.target.checked }))} /> Required signage posted</label>
    <label><input type="checkbox" checked={inspectionChecklistForm.handwashing_sink_compliant} onChange={(e) => setInspectionChecklistForm((prev) => ({ ...prev, handwashing_sink_compliant: e.target.checked }))} /> Handwashing sink compliant</label>

    <div style={styles.dateField}>
      <label style={styles.inputLabel}>Notes</label>
      <input
        style={styles.input}
        value={inspectionChecklistForm.notes}
        onChange={(e) =>
          setInspectionChecklistForm((prev) => ({
            ...prev,
            notes: e.target.value,
          }))
        }
      />
    </div>

    <button
  type="button"
  style={styles.button}
  onClick={saveInspectionChecklist}
>
  Save Inspection Checklist
</button>
  </div>
)}
{log.key === "exposure_incident" &&
  activeLogKey === "exposure_incident" && (
    <div style={styles.inlineActions}>
      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Incident Date</label>
        <input
          type="date"
          style={styles.input}
          value={exposureForm.entry_date}
          onChange={(e) =>
            setExposureForm((prev) => ({
              ...prev,
              entry_date: e.target.value,
            }))
          }
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Incident Type</label>
        <input
          type="text"
          style={styles.input}
          value={exposureForm.incident_type}
          onChange={(e) =>
            setExposureForm((prev) => ({
              ...prev,
              incident_type: e.target.value,
            }))
          }
          placeholder="Needlestick, blood exposure, splash, cut..."
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Individuals Involved</label>
        <input
          type="text"
          style={styles.input}
          value={exposureForm.individuals_involved}
          onChange={(e) =>
            setExposureForm((prev) => ({
              ...prev,
              individuals_involved: e.target.value,
            }))
          }
          placeholder="Staff initials or internal reference"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Immediate Actions Taken</label>
        <textarea
          style={{
            ...styles.input,
            minHeight: "90px",
            resize: "vertical",
          }}
          value={exposureForm.immediate_actions}
          onChange={(e) =>
            setExposureForm((prev) => ({
              ...prev,
              immediate_actions: e.target.value,
            }))
          }
          placeholder="Washed area, reported incident, removed contaminated item..."
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Medical Follow-Up Required</label>
        <select
          style={{
            ...styles.input,
            height: "50px",
            minHeight: "50px",
          }}
          value={exposureForm.medical_follow_up_required}
          onChange={(e) =>
            setExposureForm((prev) => ({
              ...prev,
              medical_follow_up_required: e.target.value,
            }))
          }
        >
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </select>
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Outcome / Resolution</label>
        <textarea
          style={{
            ...styles.input,
            minHeight: "90px",
            resize: "vertical",
          }}
          value={exposureForm.outcome_resolution}
          onChange={(e) =>
            setExposureForm((prev) => ({
              ...prev,
              outcome_resolution: e.target.value,
            }))
          }
          placeholder="Resolved, referred for follow-up, documented internally..."
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Notes</label>
        <textarea
          style={{
            ...styles.input,
            minHeight: "90px",
            resize: "vertical",
          }}
          value={exposureForm.notes}
          onChange={(e) =>
            setExposureForm((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          placeholder="Optional notes"
        />
      </div>

      <button
        type="button"
        style={styles.button}
        onClick={saveExposureIncidentLog}
      >
        Save Exposure Incident Log
      </button>
    </div>
  )}
  {log.key === "sterilization_cycle" &&
  activeLogKey === "sterilization_cycle" && (
    <div style={styles.inlineActions}>
      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Cycle Date</label>
        <input
          type="date"
          style={styles.input}
          value={sterilizationCycleForm.entry_date}
          onChange={(e) =>
            setSterilizationCycleForm((prev) => ({
              ...prev,
              entry_date: e.target.value,
            }))
          }
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Load Number</label>
        <input
          type="text"
          style={styles.input}
          value={sterilizationCycleForm.load_number}
          onChange={(e) =>
            setSterilizationCycleForm((prev) => ({
              ...prev,
              load_number: e.target.value,
            }))
          }
          placeholder="Load, batch, or cycle number"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Autoclave Used</label>
        <input
          type="text"
          style={styles.input}
          value={sterilizationCycleForm.autoclave_used}
          onChange={(e) =>
            setSterilizationCycleForm((prev) => ({
              ...prev,
              autoclave_used: e.target.value,
            }))
          }
          placeholder="Autoclave name, number, or machine ID"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Operator</label>
        <input
          type="text"
          style={styles.input}
          value={sterilizationCycleForm.operator}
          onChange={(e) =>
            setSterilizationCycleForm((prev) => ({
              ...prev,
              operator: e.target.value,
            }))
          }
          placeholder="Operator name or initials"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Cycle Result</label>
        <select
          style={{
            ...styles.input,
            height: "50px",
            minHeight: "50px",
          }}
          value={sterilizationCycleForm.cycle_result}
          onChange={(e) =>
            setSterilizationCycleForm((prev) => ({
              ...prev,
              cycle_result: e.target.value,
            }))
          }
        >
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Notes</label>
        <textarea
          style={{
            ...styles.input,
            minHeight: "90px",
            resize: "vertical",
          }}
          value={sterilizationCycleForm.notes}
          onChange={(e) =>
            setSterilizationCycleForm((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          placeholder="Optional notes"
        />
      </div>

      <button
        type="button"
        style={styles.button}
        onClick={saveSterilizationCycleLog}
      >
        Save Sterilization Cycle Log
      </button>
    </div>
  )}
  {log.key === "jewelry_sterilization" &&
  activeLogKey === "jewelry_sterilization" && (
    <div style={styles.inlineActions}>
      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Sterilization Date</label>
        <input
          type="date"
          style={styles.input}
          value={jewelrySterilizationForm.entry_date}
          onChange={(e) =>
            setJewelrySterilizationForm((prev) => ({
              ...prev,
              entry_date: e.target.value,
            }))
          }
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Jewelry Batch</label>
        <input
          type="text"
          style={styles.input}
          value={jewelrySterilizationForm.jewelry_batch}
          onChange={(e) =>
            setJewelrySterilizationForm((prev) => ({
              ...prev,
              jewelry_batch: e.target.value,
            }))
          }
          placeholder="Batch, tray, pouch, or internal ID"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Material</label>
        <input
          type="text"
          style={styles.input}
          value={jewelrySterilizationForm.material}
          onChange={(e) =>
            setJewelrySterilizationForm((prev) => ({
              ...prev,
              material: e.target.value,
            }))
          }
          placeholder="Titanium, steel, gold, glass..."
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Method</label>
        <input
          type="text"
          style={styles.input}
          value={jewelrySterilizationForm.method}
          onChange={(e) =>
            setJewelrySterilizationForm((prev) => ({
              ...prev,
              method: e.target.value,
            }))
          }
          placeholder="Steam autoclave, sterile pouch, etc."
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Operator</label>
        <input
          type="text"
          style={styles.input}
          value={jewelrySterilizationForm.operator}
          onChange={(e) =>
            setJewelrySterilizationForm((prev) => ({
              ...prev,
              operator: e.target.value,
            }))
          }
          placeholder="Operator name or initials"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Result</label>
        <select
          style={{
            ...styles.input,
            height: "50px",
            minHeight: "50px",
          }}
          value={jewelrySterilizationForm.result}
          onChange={(e) =>
            setJewelrySterilizationForm((prev) => ({
              ...prev,
              result: e.target.value,
            }))
          }
        >
          <option value="pass">Pass</option>
          <option value="fail">Fail</option>
        </select>
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Notes</label>
        <textarea
          style={{
            ...styles.input,
            minHeight: "90px",
            resize: "vertical",
          }}
          value={jewelrySterilizationForm.notes}
          onChange={(e) =>
            setJewelrySterilizationForm((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          placeholder="Optional notes"
        />
      </div>

      <button
        type="button"
        style={styles.button}
        onClick={saveJewelrySterilizationLog}
      >
        Save Jewelry Sterilization Log
      </button>
    </div>
  )}

{log.key === "autoclave_maintenance" &&
  activeLogKey === "autoclave_maintenance" && (
    <div style={styles.inlineActions}>
      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Service Date</label>
        <input
          type="date"
          style={styles.input}
          value={autoclaveForm.entry_date}
          onChange={(e) =>
            setAutoclaveForm((prev) => ({
              ...prev,
              entry_date: e.target.value,
            }))
          }
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Machine ID</label>
        <input
          type="text"
          style={styles.input}
          value={autoclaveForm.machine_id}
          onChange={(e) =>
            setAutoclaveForm((prev) => ({
              ...prev,
              machine_id: e.target.value,
            }))
          }
          placeholder="Autoclave name, number, or model"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Service Performed</label>
        <input
          type="text"
          style={styles.input}
          value={autoclaveForm.service_performed}
          onChange={(e) =>
            setAutoclaveForm((prev) => ({
              ...prev,
              service_performed: e.target.value,
            }))
          }
          placeholder="Cleaning, calibration, repair, inspection..."
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Technician / Vendor</label>
        <input
          type="text"
          style={styles.input}
          value={autoclaveForm.technician_vendor}
          onChange={(e) =>
            setAutoclaveForm((prev) => ({
              ...prev,
              technician_vendor: e.target.value,
            }))
          }
          placeholder="Technician, vendor, or internal staff"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Notes</label>
        <textarea
          style={{
            ...styles.input,
            minHeight: "90px",
            resize: "vertical",
          }}
          value={autoclaveForm.notes}
          onChange={(e) =>
            setAutoclaveForm((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          placeholder="Optional notes"
        />
      </div>

    <button
  type="button"
  style={styles.button}
  onClick={saveAutoclaveLog}
>
  Save Autoclave Log
</button>
    </div>
  )}
  {log.key === "sharps_disposal" &&
  activeLogKey === "sharps_disposal" && (
    <div style={styles.inlineActions}>
      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Pickup Date</label>
        <input
          type="date"
          style={styles.input}
          value={sharpsForm.entry_date}
          onChange={(e) =>
            setSharpsForm((prev) => ({
              ...prev,
              entry_date: e.target.value,
            }))
          }
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Vendor</label>
        <input
          type="text"
          style={styles.input}
          value={sharpsForm.vendor}
          onChange={(e) =>
            setSharpsForm((prev) => ({
              ...prev,
              vendor: e.target.value,
            }))
          }
          placeholder="Sharps disposal vendor"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Manifest Number</label>
        <input
          type="text"
          style={styles.input}
          value={sharpsForm.manifest_number}
          onChange={(e) =>
            setSharpsForm((prev) => ({
              ...prev,
              manifest_number: e.target.value,
            }))
          }
          placeholder="Manifest, pickup, or receipt number"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Container Count</label>
        <input
          type="number"
          min="0"
          style={styles.input}
          value={sharpsForm.container_count}
          onChange={(e) =>
            setSharpsForm((prev) => ({
              ...prev,
              container_count: e.target.value,
            }))
          }
          placeholder="Number of containers picked up"
        />
      </div>

      <div style={styles.dateField}>
        <label style={styles.inputLabel}>Notes</label>
        <textarea
          style={{
            ...styles.input,
            minHeight: "90px",
            resize: "vertical",
          }}
          value={sharpsForm.notes}
          onChange={(e) =>
            setSharpsForm((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          placeholder="Optional notes"
        />
      </div>

      <button
        type="button"
        style={styles.button}
        onClick={saveSharpsDisposalLog}
      >
        Save Sharps Disposal Log
      </button>
    </div>
  )}
{openLogHistory === log.key && (
  <div
    style={{
      marginTop: "18px",
      borderTop: "1px solid rgba(255,255,255,0.08)",
      paddingTop: "16px",
    }}
  >
    {logEntries
      .filter((entry) => entry.log_type_key === log.key).filter(
  (entry) =>
    entry.log_type_key === log.key &&
    !entry.archived
)
      .map((entry) => (
        <div
          key={entry.id}
          style={{
            padding: "12px",
            border: "1px solid rgba(255,255,255,0.06)",
            borderRadius: "12px",
            marginBottom: "10px",
            background: "#111",
          }}
        >
          <strong>{entry.entry_date}</strong>

          <button
  type="button"
  style={{
    ...styles.secondaryButton,
    marginTop: "10px",
    marginBottom: "10px",
    fontSize: "12px",
    minHeight: "32px",
  }}
  onClick={() => archiveComplianceLogEntry(entry.id)}
>
  Archive Entry
</button>

          {log.key === "spore_test" && (
            <>
              <p style={styles.helperText}>
                <strong>Result:</strong> {entry.result || "N/A"}
              </p>

              <p style={styles.helperText}>
                <strong>Lab / Incubator:</strong>{" "}
                {entry.fields?.lab_or_incubator || "-"}
              </p>

              <p style={styles.helperText}>
                <strong>Lot Number:</strong>{" "}
                {entry.fields?.lot_number || "-"}
              </p>

              {entry.notes && (
                <p style={styles.helperText}>
                  <strong>Notes:</strong> {entry.notes}
                </p>
              )}
            </>
          )}

          {log.key === "autoclave_maintenance" && (
            <>
              <p style={styles.helperText}>
                <strong>Service Date:</strong>{" "}
                {entry.entry_date || "Not recorded"}
              </p>

              <p style={styles.helperText}>
                <strong>Machine ID:</strong>{" "}
                {entry.machine_id || "Not recorded"}
              </p>

              <p style={styles.helperText}>
                <strong>Service Performed:</strong>{" "}
                {entry.service_performed || "Not recorded"}
              </p>

              <p style={styles.helperText}>
                <strong>Technician / Vendor:</strong>{" "}
                {entry.technician_vendor || "Not recorded"}
              </p>

              {entry.notes && (
                <p style={styles.helperText}>
                  <strong>Notes:</strong> {entry.notes}
                </p>
              )}
            </>
          )}
          {log.key === "sharps_disposal" && (
  <>
    <p style={styles.helperText}>
      <strong>Pickup Date:</strong>{" "}
      {entry.entry_date || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Vendor:</strong>{" "}
      {entry.fields?.vendor || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Manifest Number:</strong>{" "}
      {entry.fields?.manifest_number || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Container Count:</strong>{" "}
      {entry.fields?.container_count || "Not recorded"}
    </p>

    {entry.notes && (
      <p style={styles.helperText}>
        <strong>Notes:</strong> {entry.notes}
      </p>
    )}
  </>
)}
{log.key === "exposure_incident" && (
  <>
    <p style={styles.helperText}>
      <strong>Incident Date:</strong>{" "}
      {entry.entry_date || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Incident Type:</strong>{" "}
      {entry.fields?.incident_type || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Individuals Involved:</strong>{" "}
      {entry.fields?.individuals_involved || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Immediate Actions Taken:</strong>{" "}
      {entry.fields?.immediate_actions || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Medical Follow-Up Required:</strong>{" "}
      {entry.fields?.medical_follow_up_required || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Outcome / Resolution:</strong>{" "}
      {entry.fields?.outcome_resolution || "Not recorded"}
    </p>

    {entry.notes && (
      <p style={styles.helperText}>
        <strong>Notes:</strong> {entry.notes}
      </p>
    )}
  </>
)}
{log.key === "sterilization_cycle" && (
  <>
    <p style={styles.helperText}>
      <strong>Cycle Date:</strong>{" "}
      {entry.entry_date || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Load Number:</strong>{" "}
      {entry.fields?.load_number || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Autoclave Used:</strong>{" "}
      {entry.fields?.autoclave_used || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Operator:</strong>{" "}
      {entry.fields?.operator || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Cycle Result:</strong>{" "}
      {entry.result || "Not recorded"}
    </p>

    {entry.notes && (
      <p style={styles.helperText}>
        <strong>Notes:</strong> {entry.notes}
      </p>
    )}
  </>
)}
{log.key === "inspection_checklist" && (
  <>
    <p style={styles.helperText}>
      <strong>Employee Initials:</strong>{" "}
      {entry.fields?.employee_initials || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Licenses Posted:</strong>{" "}
      {entry.fields?.licenses_posted ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>BBP Certificates Current:</strong>{" "}
      {entry.fields?.bbp_current ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Consent Forms Available:</strong>{" "}
      {entry.fields?.consent_forms_available ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Aftercare Instructions Available:</strong>{" "}
      {entry.fields?.aftercare_available ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Sharps Containers Compliant:</strong>{" "}
      {entry.fields?.sharps_compliant ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Spore Tests Current:</strong>{" "}
      {entry.fields?.spore_tests_current ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Autoclave Records Available:</strong>{" "}
      {entry.fields?.autoclave_records_available ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Biohazard Disposal Records Available:</strong>{" "}
      {entry.fields?.biohazard_records_available ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Required Signage Posted:</strong>{" "}
      {entry.fields?.required_signage_posted ? "Yes" : "No"}
    </p>

    <p style={styles.helperText}>
      <strong>Handwashing Sink Compliant:</strong>{" "}
      {entry.fields?.handwashing_sink_compliant ? "Yes" : "No"}
    </p>

    {entry.notes && (
      <p style={styles.helperText}>
        <strong>Notes:</strong> {entry.notes}
      </p>
    )}
  </>
)}
{log.key === "jewelry_sterilization" && (
  <>
    <p style={styles.helperText}>
      <strong>Sterilization Date:</strong>{" "}
      {entry.entry_date || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Jewelry Batch:</strong>{" "}
      {entry.fields?.jewelry_batch || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Material:</strong>{" "}
      {entry.fields?.material || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Method:</strong>{" "}
      {entry.fields?.method || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Operator:</strong>{" "}
      {entry.fields?.operator || "Not recorded"}
    </p>

    <p style={styles.helperText}>
      <strong>Result:</strong>{" "}
      {entry.result || "Not recorded"}
    </p>

    {entry.notes && (
      <p style={styles.helperText}>
        <strong>Notes:</strong> {entry.notes}
      </p>
    )}
  </>
)}
        </div>
      ))}
  </div>
)}
            </div>
          );
        })}
      </div>
    </section>
  );
}
<div style={styles.card}>
  <h2 style={styles.sectionTitle}>Archived Compliance Logs</h2>

  <p style={styles.helperText}>
    Archived logs are retained for audit history and can be restored at any time.
  </p>

  {logEntries.filter((entry) => entry.archived).length === 0 ? (
    <p style={styles.emptyText}>No archived compliance logs.</p>
  ) : (
    logTypes.map((log) => {
      const archivedEntries = logEntries.filter(
        (entry) => entry.log_type_key === log.key && entry.archived
      );

      if (archivedEntries.length === 0) return null;

      return (
        <div key={`archived-${log.key}`} style={styles.logCard}>
          <h3 style={styles.logTitle}>{log.name}</h3>

          {archivedEntries.map((entry) => (
            <div key={entry.id} style={styles.historyItem}>
              <p>
                <strong>Date:</strong> {entry.entry_date || "Not recorded"}
              </p>

              {entry.result && (
                <p>
                  <strong>Result:</strong> {entry.result}
                </p>
              )}

              {entry.notes && (
                <p>
                  <strong>Notes:</strong> {entry.notes}
                </p>
              )}

              <button
                type="button"
                style={styles.secondaryButton}
                onClick={() => restoreComplianceLogEntry(entry.id)}
              >
                Restore Log
              </button>
            </div>
          ))}
        </div>
      );
    })
  )}
</div>
function renderArchivedComplianceLogs() {
  const archivedLogCount = logEntries.filter((entry) => entry.archived).length;

 return (
  <section style={styles.card}>
    <div style={styles.sectionHeader}>
      <div>
        <h2 style={styles.sectionTitle}>
          Archived Compliance Logs
        </h2>

        <p style={styles.helperText}>
          Archived logs are retained for audit history and can be restored at any time.
        </p>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
  <span
  style={{
    minWidth: "36px",
    height: "36px",
    borderRadius: "999px",
    background: "#FC5B00",
    color: "#fff",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    boxShadow: "0 0 24px rgba(252,91,0,0.45)",
  }}
>
  {archivedLogCount}
</span>

  <button
    type="button"
    style={styles.secondaryButton}
    onClick={() => setArchivedLogsOpen((prev) => !prev)}
  >
    {archivedLogsOpen ? "Close Archive" : "Open Archive"}
  </button>
</div>
    </div>

    {archivedLogsOpen && (
  <>
 <input
  type="text"
  placeholder="Search archived logs..."
  value={archivedSearch}
  onChange={(e) =>
    setArchivedSearch(e.target.value)
  }
  style={{
    ...styles.input,
    width: "100%",
    marginBottom: 16,
  }}
/>

      {logEntries.filter((entry) => entry.archived).length === 0 ? (
        <p style={styles.helperText}>
          No archived compliance logs.
        </p>
      ) : (
        logTypes.map((log) => {
          const archivedEntries = logEntries.filter(
            (entry) =>
              entry.log_type_key === log.key &&
              entry.archived
          );

          const filteredArchivedEntries = archivedEntries.filter(
  (entry) => {
    const search = archivedSearch.toLowerCase();

    return (
      log.name.toLowerCase().includes(search) ||
      entry.result?.toLowerCase().includes(search) ||
      entry.notes?.toLowerCase().includes(search) ||
      entry.entry_date?.includes(search)
    );
  }
);

          if (filteredArchivedEntries.length === 0) return null;

          return (
            <section
              key={`archived-${log.key}`}
              style={styles.card}
            >
              <h3>{log.name}</h3>

              {filteredArchivedEntries.map((entry) => (
                <div
                  key={entry.id}
                  style={styles.historyItem}
                >
                  <p style={styles.helperText}>
                    <strong>Date:</strong>{" "}
                    {entry.entry_date || "Not recorded"}
                  </p>

                  <p style={styles.helperText}>
                    <strong>Result:</strong>{" "}
                    {entry.result || "Not recorded"}
                  </p>

                  {entry.notes && (
                    <p style={styles.helperText}>
                      <strong>Notes:</strong>{" "}
                      {entry.notes}
                    </p>
                  )}

                  <button
                    type="button"
                    style={styles.secondaryButton}
                    onClick={() =>
                      restoreComplianceLogEntry(entry.id)
                    }
                  >
                    Restore Log
                  </button>
                </div>
              ))}
            </section>
          );
        })
      )}
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
    <h2 style={styles.sectionTitle}>
      {title} — Completed Records
    </h2>
  </div>

  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "10px",
      flexWrap: "wrap",
    }}
  >
    <button
      type="button"
      style={styles.secondaryButton}
      onClick={() => exportRequirementsPdf()}
    >
      Export Requirements PDF
    </button>

    <button
  type="button"
  style={styles.secondaryButton}
  onClick={() => exportFullComplianceReportPdf()}
>
  Export Full Compliance Report
</button>

    <span style={styles.sectionCount}>
      {sectionCompleted.length}
    </span>
  </div>
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
  Artist view is for individual artists, including tattoo artists
  and piercers. Shop view includes studio-level records like permits,
  sharps disposal, sterilization logs, and facility compliance.
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
        
  <strong>Job Hub Privacy</strong>

  <p style={styles.helperText}>
    Share only your compliance status with shops/employers later.
    Uploaded documents stay private unless you choose otherwise.
  </p>

<div
  style={{
    marginTop: "12px",
    padding: "12px 14px",
    borderRadius: "12px",
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
  }}
>
<p
  style={{
    marginTop: "6px",
    color: "#7f7f7f",
    fontSize: "12px",
    lineHeight: "1.5",
  }}
>
  Enable before submitting an opportunity or open to work profile to display your public APA
  compliance badge.
</p>

  <p
    style={{
      marginTop: "6px",
      marginBottom: 0,
      color: "#7f7f7f",
      fontSize: "12px",
      lineHeight: "1.5",
    }}
  >
    Changing this setting later will not automatically update
    listings already submitted.
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
  !message.toLowerCase().includes("required compliance items loaded") &&
  !message.toLowerCase().includes("log saved") && (
    <p style={styles.message}>{message}</p>
)}
      </section>

      {isAllianceMember && renderActivityFeed()}

      {filteredRecords.length === 0 && (
        <section style={styles.card}>
         {renderEmptyState(
  "No records match your filters.",
  "Try clearing the search box, changing filters, or switching between Artist, Shop, and Both."
)}
        </section>
      )}

      <div
  style={{
    marginBottom: "20px",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,138,61,0.35)",
    background: "rgba(255,138,61,0.08)",
  }}
>
  <div
    style={{
      color: "#ff8a3d",
      fontWeight: 700,
      marginBottom: "8px",
    }}
  >
    Ongoing Documentation Requirements
  </div>

  <div
    style={{
      color: "#d1d5db",
      fontSize: "14px",
      lineHeight: 1.6,
    }}
  >
    Some compliance items represent ongoing recordkeeping obligations
    such as consent forms, aftercare documentation, minor consent
    records, and client advisories.
    <br />
    <br />
    These items remain visible as compliance reminders but do not
    affect your compliance score. Users are responsible for maintaining
    current records and retaining documentation as required by
    applicable laws and regulations.
  </div>
</div>

      {viewMode === "both" ? (
        <>
        <div
  style={{
    marginBottom: "20px",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(255,138,61,0.35)",
    background: "rgba(255,138,61,0.08)",
  }}
>
  <div
    style={{
      color: "#ff8a3d",
      fontWeight: 700,
      marginBottom: "8px",
    }}
  >
    Ongoing Documentation Requirements
  </div>

  <div
    style={{
      color: "#d1d5db",
      fontSize: "14px",
      lineHeight: 1.6,
    }}
  >
    Some compliance items represent ongoing recordkeeping obligations
    such as consent forms, aftercare documentation, minor consent
    records, and client advisories.
    <br />
    <br />
    These items remain visible as compliance reminders but do not
    affect your compliance score. Users are responsible for maintaining
    current records and retaining documentation as required by
    applicable laws and regulations.
  </div>
</div>
          {renderRequirementSection("Requirements", artistRecords)}
          {renderRequirementSection("Shop Requirements", shopRecords)}
        </>
      ) : viewMode === "shop" ? (
        renderRequirementSection("Shop Requirements", shopRecords)
      ) : (
        renderRequirementSection("Requirements", artistRecords)
      )}
 <AllianceGate
  allowed={isAllianceMember}
  title="Alliance Compliance Operations"
  description="Unlock document vault storage, expiration tracking, reminder emails, compliance history, uploads, and full compliance management tools for tattoo artists, piercers, and shops."
>
  {renderComplianceLogs()}

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
        {renderArchivedComplianceLogs()}
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
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function CompliancePage() {
  const [members, setMembers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [compliance, setCompliance] = useState<any[]>([]);

  const [memberId, setMemberId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [status, setStatus] = useState("pending");
  const [completionDate, setCompletionDate] = useState("");
  const [renewalDate, setRenewalDate] = useState("");

  // Load dropdown + existing compliance data
  useEffect(() => {
    const load = async () => {
      const { data: membersData } = await supabase.from("members").select("*");
      const { data: locationsData } = await supabase.from("locations").select("*");

      const { data: complianceData } = await supabase
        .from("member_compliance")
        .select(`
          id,
          status,
          completion_date,
          renewal_date,
          members(name),
          locations(county, state)
        `);

      if (membersData) setMembers(membersData);
      if (locationsData) setLocations(locationsData);
      if (complianceData) setCompliance(complianceData);
    };

    load();
  }, []);

  // Save new compliance record
  const submit = async () => {
    const { error } = await supabase.from("member_compliance").insert([
      {
        member_id: memberId,
        location_id: locationId,
        status: status,
        completion_date: completionDate || null,
        renewal_date: renewalDate || null,
      },
    ]);

    if (!error) {
      // refresh list
      const { data } = await supabase
        .from("member_compliance")
        .select(`
          id,
          status,
          completion_date,
          renewal_date,
          members(name),
          locations(county, state)
        `);

      if (data) setCompliance(data);

      // reset form
      setMemberId("");
      setLocationId("");
      setStatus("pending");
      setCompletionDate("");
      setRenewalDate("");
    }

    console.log("INSERT ERROR:", error);
  };

  return (
    <div style={{ padding: 30, fontFamily: "sans-serif" }}>
      <h1>Compliance Input Form</h1>

      {/* MEMBER */}
      <div style={{ marginBottom: 10 }}>
        <label>Member</label>
        <br />
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)}>
          <option value="">Select member</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* LOCATION */}
      <div style={{ marginBottom: 10 }}>
        <label>Location</label>
        <br />
        <select
          value={locationId}
          onChange={(e) => setLocationId(e.target.value)}
        >
          <option value="">Select location</option>
          {locations.map((l) => (
            <option key={l.id} value={l.id}>
              {l.county}, {l.state}
            </option>
          ))}
        </select>
      </div>

      {/* STATUS */}
      <div style={{ marginBottom: 10 }}>
        <label>Status</label>
        <br />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="compliant">Compliant</option>
          <option value="pending">Pending</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {/* DATES */}
      <div style={{ marginBottom: 10 }}>
        <label>Completion Date</label>
        <br />
        <input
          type="date"
          value={completionDate}
          onChange={(e) => setCompletionDate(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 10 }}>
        <label>Renewal Date</label>
        <br />
        <input
          type="date"
          value={renewalDate}
          onChange={(e) => setRenewalDate(e.target.value)}
        />
      </div>

      {/* SUBMIT */}
      <button
        onClick={submit}
        style={{
          marginTop: 10,
          padding: "10px 16px",
          background: "#FF5500",
          color: "#fff",
          border: "none",
          cursor: "pointer",
        }}
      >
        Save Compliance Record
      </button>

      <hr style={{ margin: "30px 0" }} />

      {/* DASHBOARD */}
      <h2>Existing Compliance</h2>

      {compliance.map((row) => (
        <div key={row.id} style={{ marginBottom: 15 }}>
          <div>
            <b>Member:</b> {row.members?.name}
          </div>

          <div>
            <b>Location:</b> {row.locations?.county},{" "}
            {row.locations?.state}
          </div>

          <div>
            <b>Status:</b> {row.status}
          </div>

          <div>
            <b>Completion:</b> {row.completion_date || "—"}
          </div>

          <div>
            <b>Renewal:</b> {row.renewal_date || "—"}
          </div>

          <hr />
        </div>
      ))}
    </div>
  );
}
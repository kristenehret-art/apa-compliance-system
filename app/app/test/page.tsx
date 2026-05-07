"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type ComplianceItem = {
  id: number;
  name: string;
  description: string;
  category: string;
  default_expiry_months: number;
};

export default function Home() {
  const [items, setItems] = useState<ComplianceItem[]>([]);
  const [records, setRecords] = useState<any[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [state, setState] = useState("AZ");
  const [county, setCounty] = useState("Maricopa");
  const [completedDate, setCompletedDate] = useState("");
  const [expiresDate, setExpiresDate] = useState("");
  const [message, setMessage] = useState("");

  const userId = 1;

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const { data: complianceItems } = await supabase
      .from("compliance_items")
      .select("*")
      .order("id");

    const { data: userRecords } = await supabase
      .from("user_compliance_items")
      .select(`
        *,
        compliance_items (
          name,
          category
        )
      `)
      .eq("user_id", userId)
      .order("expires_date", { ascending: true });

    setItems(complianceItems || []);
    setRecords(userRecords || []);
  }

  function addMonths(dateString: string, months: number) {
    const date = new Date(dateString);
    date.setMonth(date.getMonth() + months);
    return date.toISOString().split("T")[0];
  }

  function calculateNextReminder(expirationDate: string) {
    const today = new Date();
    const expires = new Date(expirationDate);

    const daysUntilExpiration = Math.ceil(
      (expires.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    let reminderDays = 30;

    if (daysUntilExpiration >= 90) {
      reminderDays = 90;
    } else if (daysUntilExpiration >= 60) {
      reminderDays = 60;
    } else if (daysUntilExpiration >= 30) {
      reminderDays = 30;
    } else {
      return today.toISOString().split("T")[0];
    }

    const reminderDate = new Date(expirationDate);
    reminderDate.setDate(reminderDate.getDate() - reminderDays);

    return reminderDate.toISOString().split("T")[0];
  }

  function handleItemChange(itemId: string) {
    setSelectedItemId(itemId);

    const item = items.find((i) => i.id === Number(itemId));

    if (item && completedDate) {
      setExpiresDate(addMonths(completedDate, item.default_expiry_months));
    }
  }

  function handleCompletedDateChange(date: string) {
    setCompletedDate(date);

    const item = items.find((i) => i.id === Number(selectedItemId));

    if (item && date) {
      setExpiresDate(addMonths(date, item.default_expiry_months));
    }
  }

  async function saveComplianceRecord() {
    setMessage("");

    if (!selectedItemId || !completedDate || !expiresDate) {
      setMessage("Please select an item and enter the completed date.");
      return;
    }

    const nextReminderDate = calculateNextReminder(expiresDate);

    const { error } = await supabase.from("user_compliance_items").insert({
      user_id: userId,
      compliance_item_id: Number(selectedItemId),
      location_state: state,
      location_county: county,
      completed_date: completedDate,
      expires_date: expiresDate,
      next_reminder_date: nextReminderDate,
      reminder_enabled: true,
      last_reminder_days: null,
      status: "active",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Compliance item saved successfully.");
    setSelectedItemId("");
    setCompletedDate("");
    setExpiresDate("");
    loadData();
  }

  return (
    <main style={{ padding: 40, fontFamily: "Arial, sans-serif" }}>
      <h1>APA Compliance Dashboard</h1>
      <p>Track tattoo compliance items, expiration dates, and reminders.</p>

      <section style={{ marginTop: 30, padding: 20, border: "1px solid #ddd" }}>
        <h2>Add Compliance Item</h2>

        <label>State</label>
        <br />
        <input value={state} onChange={(e) => setState(e.target.value)} />

        <br />
        <br />

        <label>County / City</label>
        <br />
        <input value={county} onChange={(e) => setCounty(e.target.value)} />

        <br />
        <br />

        <label>Compliance Item</label>
        <br />
        <select
          value={selectedItemId}
          onChange={(e) => handleItemChange(e.target.value)}
        >
          <option value="">Select item</option>
          {items.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name} — {item.category}
            </option>
          ))}
        </select>

        <br />
        <br />

        <label>Date Completed</label>
        <br />
        <input
          type="date"
          value={completedDate}
          onChange={(e) => handleCompletedDateChange(e.target.value)}
        />

        <br />
        <br />

        <label>Expiration Date</label>
        <br />
        <input
          type="date"
          value={expiresDate}
          onChange={(e) => setExpiresDate(e.target.value)}
        />

        <br />
        <br />

        <button onClick={saveComplianceRecord} style={{ padding: 12 }}>
          Save Compliance Item
        </button>

        {message && <p>{message}</p>}
      </section>

      <section style={{ marginTop: 40 }}>
        <h2>Your Compliance Records</h2>

        {records.length === 0 && <p>No compliance records saved yet.</p>}

        {records.map((record) => (
          <div
            key={record.id}
            style={{
              padding: 15,
              marginBottom: 10,
              border: "1px solid #ddd",
              borderRadius: 8,
            }}
          >
            <strong>{record.compliance_items?.name}</strong>
            <p>
              Location: {record.location_state}, {record.location_county}
            </p>
            <p>Completed: {record.completed_date || "Not entered"}</p>
            <p>Expires: {record.expires_date || "Not entered"}</p>
            <p>Next Reminder: {record.next_reminder_date || "None"}</p>
            <p>Status: {record.status}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
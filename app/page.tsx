"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const [compliance, setCompliance] = useState<any[]>([]);

  useEffect(() => {
    const run = async () => {
      const { data, error } = await supabase
        .from("member_compliance")
        .select(`
          id,
          status,
          members(name),
          locations(county, state)
        `);

      if (data) setCompliance(data);
      console.log(data, error);
    };

    run();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case "compliant":
        return "#FF5500"; // brand orange accent
      case "pending":
        return "#BFBFBF"; // gray
      case "expired":
        return "#000000"; // black (warning tone in your scheme)
      default:
        return "#BFBFBF";
    }
  };

  return (
    <div style={{ background: "#FFFFFF", minHeight: "100vh", padding: 30 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ color: "#000000", fontSize: 28, fontWeight: 700 }}>
          APA Compliance Dashboard
        </h1>
        <p style={{ color: "#BFBFBF" }}>
          Member compliance overview
        </p>
      </div>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        {compliance.map((row) => (
          <div
            key={row.id}
            style={{
              background: "#FFFFFF",
              border: "1px solid #BFBFBF",
              borderRadius: 12,
              padding: 16,
            }}
          >
            {/* Member */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#BFBFBF" }}>Member</div>
              <div style={{ color: "#000000", fontWeight: 600 }}>
                {row.members?.name}
              </div>
            </div>

            {/* Location */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: "#BFBFBF" }}>Location</div>
              <div style={{ color: "#000000" }}>
                {row.locations?.county}, {row.locations?.state}
              </div>
            </div>

            {/* Status */}
            <div>
              <div style={{ fontSize: 12, color: "#BFBFBF" }}>Status</div>
              <span
                style={{
                  display: "inline-block",
                  marginTop: 6,
                  padding: "4px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: getStatusColor(row.status),
                }}
              >
                {row.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
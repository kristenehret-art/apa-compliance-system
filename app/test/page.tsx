"use client";

import { useState } from "react";

export default function Page() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    setResult(null);

    try {
      const res = await fetch(
        "http://127.0.0.1:54321/functions/v1/compliance-alerts",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ test: true }),
        }
      );

      const json = await res.json();
      setResult(json);
    } catch (err: any) {
      setResult({ error: err.message });
    }

    setLoading(false);
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Function Test</h1>

      <button onClick={run} style={{ padding: 12 }}>
        Run Compliance Alert
      </button>

      {loading && <p>Running...</p>}

      {result && (
        <pre style={{ marginTop: 20 }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
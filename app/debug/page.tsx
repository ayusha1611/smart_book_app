"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function DebugPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState("idle");

  const log = (msg: string) => {
    const time = new Date().toISOString().split("T")[1].split(".")[0];
    setLogs((p) => [`[${time}] ${msg}`, ...p]);
  };

  useEffect(() => {
    const supabase = createClient();
    log("Creating channel...");
    const ch = supabase
      .channel("debug_test_channel")
      .on("postgres_changes", { event: "*", schema: "public", table: "bookmarks" }, (payload) => {
        log(`✅ EVENT: ${payload.eventType} — id=${(payload.new as {id?:string})?.id || (payload.old as {id?:string})?.id}`);
      })
      .subscribe((s, err) => {
        log(`Channel status → ${s}${err ? " ERR:" + JSON.stringify(err) : ""}`);
        setStatus(s);
      });
    return () => { supabase.removeChannel(ch); };
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "monospace", background: "#0d0d0d", color: "#ccc", minHeight: "100vh" }}>
      <h1 style={{ color: "#fff", marginBottom: 8 }}>🔍 Realtime Debug</h1>
      <p style={{ marginBottom: 4 }}>
        Channel: <strong style={{ color: status === "SUBSCRIBED" ? "#22c55e" : "#ef4444" }}>{status}</strong>
      </p>
      <p style={{ color: "#666", marginBottom: 16, fontSize: 13 }}>
        Keep this tab open. In another tab, add or delete a bookmark. Events should appear below instantly.
      </p>
      <div style={{ borderTop: "1px solid #222", paddingTop: 16, fontSize: 13, lineHeight: 2 }}>
        {logs.length === 0
          ? <p style={{ color: "#444" }}>No events yet. Waiting...</p>
          : logs.map((l, i) => <div key={i} style={{ color: l.includes("✅") ? "#22c55e" : "#ccc" }}>{l}</div>)
        }
      </div>
    </div>
  );
}

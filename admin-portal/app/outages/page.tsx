"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

// Leaflet must be loaded client-side only
const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const STATUS_CLASSES: Record<string, string> = {
  REPORTED: "badge-reported", ACKNOWLEDGED: "badge-review",
  CREW_DISPATCHED: "badge-dispatched", RESOLVED: "badge-resolved",
};

export default function OutagesPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => { load(); }, [filter]);

  async function load() {
    let q = supabase
      .from("outage_reports")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "ALL") q = q.eq("status", filter);
    const { data } = await q;
    setReports(data || []);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("outage_reports").update({ status }).eq("id", id);
    load();
  }

  const mapMarkers = reports
    .filter((r) => r.location_lat && r.location_lng)
    .map((r) => ({
      lat: Number(r.location_lat),
      lng: Number(r.location_lng),
      label: r.reference_number,
      status: r.status,
    }));

  const filtered = filter === "ALL" ? reports : reports.filter((r) => r.status === filter);

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary font-display">Outage Reports</h1>
        <span className="text-xs text-text-muted font-mono">{filtered.length} reports</span>
      </div>

      {/* Map */}
      <div className="card p-0 overflow-hidden mb-6" style={{ height: 360 }}>
        <MapView markers={mapMarkers} />
      </div>

      {/* Filters */}
      <div className="flex gap-1 bg-navy-900 rounded-md p-1 border border-border-subtle mb-4 w-fit">
        {["ALL", "REPORTED", "ACKNOWLEDGED", "CREW_DISPATCHED", "RESOLVED"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
              filter === s ? "bg-accent/15 text-accent" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {s === "ALL" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Status</th>
              <th>Area</th>
              <th>Address</th>
              <th>User</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs text-accent">{r.reference_number}</td>
                <td><span className={`badge ${STATUS_CLASSES[r.status] || "badge-closed"}`}>{r.status}</span></td>
                <td className="text-xs">{r.affected_area || "—"}</td>
                <td className="text-xs text-text-secondary max-w-[200px] truncate">{r.address || "—"}</td>
                <td className="text-xs text-text-secondary">{r.profiles?.name || "—"}</td>
                <td className="text-xs text-text-muted font-mono whitespace-nowrap">
                  {new Date(r.created_at).toLocaleDateString()}
                </td>
                <td>
                  <select
                    value={r.status}
                    onChange={(e) => updateStatus(r.id, e.target.value)}
                    className="text-xs py-1 px-2 bg-navy-800 border-border-subtle"
                  >
                    <option value="REPORTED">Reported</option>
                    <option value="ACKNOWLEDGED">Acknowledged</option>
                    <option value="CREW_DISPATCHED">Crew Dispatched</option>
                    <option value="RESOLVED">Resolved</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center text-text-muted text-xs py-12">No outage reports</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

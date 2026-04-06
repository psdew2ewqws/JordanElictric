"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

const STATUS_CLASSES: Record<string, string> = {
  REPORTED: "badge-reported", UNDER_REVIEW: "badge-review",
  ACTION_TAKEN: "badge-dispatched", CLOSED: "badge-closed",
};

export default function EnergyReportsPage() {
  const [reports, setReports] = useState<any[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("energy_reports")
      .select("*, profiles(name)")
      .order("created_at", { ascending: false })
      .limit(50);
    setReports(data || []);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("energy_reports").update({ status }).eq("id", id);
    load();
  }

  const mapMarkers = reports
    .filter((r) => r.location_lat && r.location_lng)
    .map((r) => ({ lat: Number(r.location_lat), lng: Number(r.location_lng), label: r.reference_number, status: r.status }));

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary font-display">Energy Reports</h1>
        <span className="text-xs text-text-muted font-mono">{reports.length} reports</span>
      </div>

      <div className="card p-0 overflow-hidden mb-6" style={{ height: 320 }}>
        <MapView markers={mapMarkers} />
      </div>

      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Hazard</th>
              <th>Status</th>
              <th>Address</th>
              <th>User</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((r) => (
              <tr key={r.id}>
                <td className="font-mono text-xs text-accent">{r.reference_number}</td>
                <td className="text-xs">{r.hazard_type?.replace(/_/g, " ")}</td>
                <td><span className={`badge ${STATUS_CLASSES[r.status] || "badge-closed"}`}>{r.status}</span></td>
                <td className="text-xs text-text-secondary max-w-[200px] truncate">{r.address || "—"}</td>
                <td className="text-xs text-text-secondary">{r.profiles?.name || "—"}</td>
                <td className="text-xs text-text-muted font-mono">{new Date(r.created_at).toLocaleDateString()}</td>
                <td>
                  <select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value)}
                    className="text-xs py-1 px-2 bg-navy-800 border-border-subtle">
                    <option value="REPORTED">Reported</option>
                    <option value="UNDER_REVIEW">Under Review</option>
                    <option value="ACTION_TAKEN">Action Taken</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
            {reports.length === 0 && (
              <tr><td colSpan={7} className="text-center text-text-muted text-xs py-12">No energy reports</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

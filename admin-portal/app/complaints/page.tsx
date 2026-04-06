"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

const STATUSES = ["ALL", "PENDING", "IN_REVIEW", "RESOLVED", "CLOSED"];
const STATUS_CLASSES: Record<string, string> = {
  PENDING: "badge-pending", IN_REVIEW: "badge-review",
  RESOLVED: "badge-resolved", CLOSED: "badge-closed",
};

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, [filter]);

  async function load() {
    let q = supabase
      .from("complaints")
      .select("*, profiles(name, email)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (filter !== "ALL") q = q.eq("status", filter);
    const { data } = await q;
    setComplaints(data || []);
  }

  async function updateStatus(id: string, status: string) {
    await supabase.from("complaints").update({ status }).eq("id", id);
    load();
  }

  const filtered = complaints.filter((c) =>
    !search || c.reference_number?.toLowerCase().includes(search.toLowerCase()) ||
    c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary font-display">Complaints</h1>
        <span className="text-xs text-text-muted font-mono">{filtered.length} records</span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex gap-1 bg-navy-900 rounded-md p-1 border border-border-subtle">
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded text-xs font-mono transition-all ${
                filter === s ? "bg-accent/15 text-accent" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {s === "ALL" ? "All" : s.replace("_", " ")}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search ref or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 max-w-xs text-xs"
        />
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Type</th>
              <th>User</th>
              <th>Status</th>
              <th>Source</th>
              <th>Description</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-xs text-accent">{c.reference_number}</td>
                <td className="text-xs">{c.complaint_type}</td>
                <td className="text-xs text-text-secondary">{c.profiles?.name || "—"}</td>
                <td><span className={`badge ${STATUS_CLASSES[c.status] || "badge-closed"}`}>{c.status}</span></td>
                <td className="text-xs text-text-muted">{c.source}</td>
                <td className="text-xs text-text-secondary max-w-[240px] truncate">{c.description}</td>
                <td className="text-xs text-text-muted font-mono whitespace-nowrap">
                  {new Date(c.created_at).toLocaleDateString()}
                </td>
                <td>
                  <select
                    value={c.status}
                    onChange={(e) => updateStatus(c.id, e.target.value)}
                    className="text-xs py-1 px-2 bg-navy-800 border-border-subtle"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="RESOLVED">Resolved</option>
                    <option value="CLOSED">Closed</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-text-muted text-xs py-12">No complaints found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

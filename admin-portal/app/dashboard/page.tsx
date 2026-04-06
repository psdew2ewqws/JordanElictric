"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

interface Metrics {
  users: number;
  subscriptions: number;
  openComplaints: number;
  outages: number;
  energyReports: number;
  chatToday: number;
}

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [recentComplaints, setRecentComplaints] = useState<any[]>([]);

  useEffect(() => {
    loadMetrics();
    loadRecentComplaints();
  }, []);

  async function loadMetrics() {
    const [users, subs, complaints, outages, reports, chats] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("subscriptions").select("*", { count: "exact", head: true }).eq("is_active", true),
      supabase.from("complaints").select("*", { count: "exact", head: true }).neq("status", "CLOSED"),
      supabase.from("outage_reports").select("*", { count: "exact", head: true }).neq("status", "RESOLVED"),
      supabase.from("energy_reports").select("*", { count: "exact", head: true }).neq("status", "CLOSED"),
      supabase.from("chat_sessions").select("*", { count: "exact", head: true })
        .gte("created_at", new Date().toISOString().slice(0, 10)),
    ]);

    setMetrics({
      users: users.count || 0,
      subscriptions: subs.count || 0,
      openComplaints: complaints.count || 0,
      outages: outages.count || 0,
      energyReports: reports.count || 0,
      chatToday: chats.count || 0,
    });
  }

  async function loadRecentComplaints() {
    const { data } = await supabase
      .from("complaints")
      .select("id, reference_number, complaint_type, status, description, created_at, source")
      .order("created_at", { ascending: false })
      .limit(8);
    setRecentComplaints(data || []);
  }

  const CARDS = metrics ? [
    { label: "Total Users", value: metrics.users, accent: "metric-accent-blue" },
    { label: "Active Subscriptions", value: metrics.subscriptions, accent: "metric-accent-green" },
    { label: "Open Complaints", value: metrics.openComplaints, accent: "metric-accent-amber" },
    { label: "Active Outages", value: metrics.outages, accent: "metric-accent-red" },
    { label: "Pending Reports", value: metrics.energyReports, accent: "metric-accent-purple" },
    { label: "Chats Today", value: metrics.chatToday, accent: "metric-accent-cyan" },
  ] : [];

  return (
    <Shell>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-bold text-text-primary font-display">Dashboard</h1>
          <p className="text-xs text-text-muted font-mono mt-0.5">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
          </p>
        </div>
        <button onClick={loadMetrics} className="btn btn-ghost text-xs">
          ↻ Refresh
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        {CARDS.map((card) => (
          <div key={card.label} className={`card metric-card ${card.accent} animate-fade-in`}>
            <p className="text-metric font-mono text-text-primary">{card.value}</p>
            <p className="text-[11px] text-text-muted font-mono mt-2 uppercase tracking-wider">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Complaints */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-text-primary">Recent Complaints</h2>
          <a href="/complaints" className="text-xs text-accent hover:underline">View all →</a>
        </div>
        <table>
          <thead>
            <tr>
              <th>Ref</th>
              <th>Type</th>
              <th>Status</th>
              <th>Source</th>
              <th>Description</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {recentComplaints.map((c) => (
              <tr key={c.id}>
                <td className="font-mono text-xs text-accent">{c.reference_number}</td>
                <td className="text-xs">{c.complaint_type}</td>
                <td><StatusBadge status={c.status} /></td>
                <td className="text-xs text-text-muted">{c.source}</td>
                <td className="text-xs text-text-secondary max-w-[200px] truncate">{c.description}</td>
                <td className="text-xs text-text-muted font-mono">{new Date(c.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {recentComplaints.length === 0 && (
              <tr><td colSpan={6} className="text-center text-text-muted text-xs py-8">No complaints yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "badge-pending",
    IN_REVIEW: "badge-review",
    RESOLVED: "badge-resolved",
    CLOSED: "badge-closed",
    REPORTED: "badge-reported",
    ACKNOWLEDGED: "badge-review",
    CREW_DISPATCHED: "badge-dispatched",
  };
  return <span className={`badge ${map[status] || "badge-closed"}`}>{status}</span>;
}

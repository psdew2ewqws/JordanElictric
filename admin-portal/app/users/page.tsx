"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => { load(); }, []);

  async function load() {
    const { data } = await supabase
      .from("profiles")
      .select("*, subscriptions(file_number, distribution_company, household_size, is_active)")
      .order("created_at", { ascending: false })
      .limit(100);
    setUsers(data || []);
  }

  const filtered = users.filter((u) =>
    !search || u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.subscriptions?.[0]?.file_number?.includes(search)
  );

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary font-display">Users</h1>
        <span className="text-xs text-text-muted font-mono">{filtered.length} users</span>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by name, email, or file number..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-md text-xs"
        />
      </div>

      <div className="card p-0 overflow-hidden">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Language</th>
              <th>File Number</th>
              <th>Company</th>
              <th>Household</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => {
              const sub = u.subscriptions?.[0];
              return (
                <tr key={u.id}>
                  <td className="text-sm font-medium">{u.name || "—"}</td>
                  <td className="text-xs text-text-secondary">{u.email}</td>
                  <td>
                    <span className={`badge ${u.role === "admin" ? "badge-review" : "badge-closed"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="text-xs font-mono">{u.language}</td>
                  <td className="font-mono text-xs text-accent">{sub?.file_number || "—"}</td>
                  <td className="text-xs">{sub?.distribution_company || "—"}</td>
                  <td className="text-xs text-center">{sub?.household_size || "—"}</td>
                  <td className="text-xs text-text-muted font-mono">{new Date(u.created_at).toLocaleDateString()}</td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="text-center text-text-muted text-xs py-12">No users found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Shell>
  );
}

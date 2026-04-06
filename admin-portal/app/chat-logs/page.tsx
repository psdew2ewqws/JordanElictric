"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

export default function ChatLogsPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<any[]>([]);

  useEffect(() => { loadSessions(); }, []);

  async function loadSessions() {
    const { data } = await supabase
      .from("chat_sessions")
      .select("*, profiles(name, email)")
      .order("updated_at", { ascending: false })
      .limit(50);
    setSessions(data || []);
  }

  async function loadMessages(sessionId: string) {
    setSelected(sessionId);
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary font-display">Chat Logs</h1>
        <span className="text-xs text-text-muted font-mono">{sessions.length} sessions</span>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4" style={{ minHeight: 500 }}>
        {/* Session list */}
        <div className="card p-0 overflow-hidden xl:col-span-1">
          <div className="px-4 py-3 border-b border-border-subtle">
            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Sessions</span>
          </div>
          <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
            {sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => loadMessages(s.id)}
                className={`w-full text-left px-4 py-3 border-b border-border-subtle/40 transition-all hover:bg-surface-hover ${
                  selected === s.id ? "bg-accent/5 border-l-2 border-l-accent" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-text-primary">{s.profiles?.name || "Unknown"}</span>
                  <span className={`w-2 h-2 rounded-full ${s.is_active ? "bg-green-400" : "bg-text-muted"}`} />
                </div>
                <p className="text-[10px] text-text-muted font-mono mt-0.5">{s.profiles?.email}</p>
                <p className="text-[10px] text-text-muted mt-0.5">
                  {new Date(s.updated_at).toLocaleString()}
                </p>
              </button>
            ))}
            {sessions.length === 0 && (
              <p className="text-xs text-text-muted text-center py-12">No chat sessions</p>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="card p-0 overflow-hidden xl:col-span-2">
          <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted uppercase tracking-wider">Messages</span>
            {selected && (
              <span className="text-[10px] text-text-muted font-mono">{messages.length} messages</span>
            )}
          </div>
          <div className="overflow-y-auto p-4 space-y-3" style={{ maxHeight: 500 }}>
            {!selected && (
              <p className="text-xs text-text-muted text-center py-12">Select a session to view messages</p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[80%] ${m.role === "user" ? "ml-auto" : "mr-auto"}`}
              >
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-accent/15 text-accent"
                      : m.role === "system"
                        ? "bg-amber-500/10 text-amber-300"
                        : "bg-navy-800 text-text-primary border border-border-subtle"
                  }`}
                >
                  {m.content}
                </div>
                <div className={`flex items-center gap-2 mt-1 ${m.role === "user" ? "justify-end" : ""}`}>
                  <span className="text-[10px] text-text-muted font-mono">
                    {m.role} {m.intent ? `· ${m.intent}` : ""}
                  </span>
                  <span className="text-[10px] text-text-muted font-mono">
                    {new Date(m.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Shell>
  );
}

"use client";
import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import { supabase } from "@/lib/supabase";

export default function NotificationsPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [titleEn, setTitleEn] = useState("");
  const [titleAr, setTitleAr] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyAr, setBodyAr] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => { loadHistory(); }, []);

  async function loadHistory() {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("type", "admin_broadcast")
      .order("created_at", { ascending: false })
      .limit(20);
    setHistory(data || []);
  }

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!titleEn || !bodyEn) return;
    setSending(true);

    // Insert broadcast notification (user_id = null means all users)
    const { error } = await supabase.from("notifications").insert({
      user_id: null,
      title: titleEn,
      title_ar: titleAr || titleEn,
      body: bodyEn,
      body_ar: bodyAr || bodyEn,
      type: "admin_broadcast",
    });

    if (!error) {
      setSent(true);
      setTitleEn(""); setTitleAr(""); setBodyEn(""); setBodyAr("");
      loadHistory();
      setTimeout(() => setSent(false), 3000);
    }
    setSending(false);
  }

  return (
    <Shell>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-lg font-bold text-text-primary font-display">Notifications</h1>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Compose */}
        <div className="card">
          <h2 className="text-sm font-bold text-text-primary mb-4 flex items-center gap-2">
            <span className="text-accent">◈</span> Compose Broadcast
          </h2>

          <form onSubmit={sendBroadcast} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Title (EN)</label>
                <input
                  value={titleEn}
                  onChange={(e) => setTitleEn(e.target.value)}
                  placeholder="Notification title"
                  className="w-full"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Title (AR)</label>
                <input
                  value={titleAr}
                  onChange={(e) => setTitleAr(e.target.value)}
                  placeholder="عنوان الإشعار"
                  className="w-full"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Body (EN)</label>
                <textarea
                  value={bodyEn}
                  onChange={(e) => setBodyEn(e.target.value)}
                  placeholder="Notification body..."
                  className="w-full min-h-[100px] resize-y"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-text-muted uppercase tracking-wider mb-1">Body (AR)</label>
                <textarea
                  value={bodyAr}
                  onChange={(e) => setBodyAr(e.target.value)}
                  placeholder="محتوى الإشعار..."
                  className="w-full min-h-[100px] resize-y"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button type="submit" disabled={sending} className="btn btn-primary">
                {sending ? "Sending..." : "⚡ Broadcast to All Users"}
              </button>
              {sent && <span className="text-xs text-green-400 font-mono">✓ Sent successfully</span>}
            </div>
          </form>
        </div>

        {/* History */}
        <div className="card">
          <h2 className="text-sm font-bold text-text-primary mb-4">Broadcast History</h2>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {history.map((n) => (
              <div key={n.id} className="p-3 bg-navy-800 rounded-md border border-border-subtle">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-bold text-text-primary">{n.title}</span>
                  <span className="text-[10px] text-text-muted font-mono">
                    {new Date(n.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-xs text-text-secondary">{n.body}</p>
                {n.title_ar && n.title_ar !== n.title && (
                  <p className="text-xs text-text-muted mt-1" dir="rtl">{n.title_ar}: {n.body_ar}</p>
                )}
              </div>
            ))}
            {history.length === 0 && (
              <p className="text-xs text-text-muted text-center py-8">No broadcasts sent yet</p>
            )}
          </div>
        </div>
      </div>
    </Shell>
  );
}

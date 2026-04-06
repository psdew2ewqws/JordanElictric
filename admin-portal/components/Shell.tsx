"use client";
import { useState, useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { supabase, requireAdmin } from "@/lib/supabase";
import type { Lang } from "@/lib/i18n";

export default function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [lang, setLang] = useState<Lang>("en");
  const [admin, setAdmin] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    requireAdmin().then((a) => {
      if (!a) {
        router.replace("/login");
      } else {
        setAdmin(a);
        setLang(a.language === "AR" ? "ar" : "en");
      }
      setLoading(false);
    });
  }, [router]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/login");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-navy-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <span className="text-text-muted text-xs font-mono">LOADING</span>
        </div>
      </div>
    );
  }

  return (
    <div dir={lang === "ar" ? "rtl" : "ltr"} className={lang === "ar" ? "font-arabic" : "font-body"}>
      <Sidebar
        lang={lang}
        onLangToggle={() => setLang((l) => (l === "en" ? "ar" : "en"))}
        onSignOut={handleSignOut}
      />
      <main
        className="min-h-screen bg-navy-950"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}

"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { t, Lang } from "@/lib/i18n";

const NAV = [
  { key: "dashboard", href: "/dashboard", icon: "◫" },
  { key: "complaints", href: "/complaints", icon: "⚑" },
  { key: "outages", href: "/outages", icon: "⚡" },
  { key: "energyReports", href: "/energy-reports", icon: "△" },
  { key: "notifications", href: "/notifications", icon: "◈" },
  { key: "users", href: "/users", icon: "◉" },
  { key: "chatLogs", href: "/chat-logs", icon: "◁" },
];

export default function Sidebar({ lang, onLangToggle, onSignOut }: {
  lang: Lang;
  onLangToggle: () => void;
  onSignOut: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside className="fixed top-0 left-0 h-screen flex flex-col bg-navy-900 border-r border-border-subtle"
      style={{ width: "var(--sidebar-width)" }}>

      {/* Brand */}
      <div className="h-14 flex items-center gap-2.5 px-5 border-b border-border-subtle">
        <div className="w-7 h-7 rounded bg-accent flex items-center justify-center">
          <span className="text-navy-950 font-bold text-sm">⚡</span>
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm text-text-primary tracking-tight font-display">
            {t("diaa", lang)}
          </span>
          <span className="text-[10px] text-text-muted font-mono uppercase tracking-widest">
            {t("admin", lang)}
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-md text-[0.8125rem] font-medium transition-all
                ${active
                  ? "bg-accent/10 text-accent border-l-2 border-accent"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface-hover border-l-2 border-transparent"
                }
              `}
            >
              <span className="text-base w-5 text-center opacity-70">{item.icon}</span>
              {t(item.key, lang)}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border-subtle space-y-2">
        <button
          onClick={onLangToggle}
          className="w-full flex items-center justify-between px-3 py-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-hover text-xs font-mono transition-all"
        >
          <span>{t("language", lang)}</span>
          <span className="badge badge-review text-[10px]">{lang === "en" ? "EN" : "عر"}</span>
        </button>
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-text-muted hover:text-red-400 hover:bg-red-500/5 text-xs transition-all"
        >
          <span>↗</span>
          {t("signOut", lang)}
        </button>
      </div>
    </aside>
  );
}

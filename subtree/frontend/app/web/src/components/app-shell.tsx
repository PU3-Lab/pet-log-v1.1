"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { AskAiPanel } from "./ask-ai-panel";
import { usePetLog } from "./pet-log-provider";
import { PetIcon } from "./pet-icons";
const navItems = [
  { href: "/", label: "홈", icon: "home" },
  { href: "/record", label: "기록", icon: "record" },
  { href: "/analysis", label: "분석", icon: "analysis" },
  { href: "/community", label: "커뮤니티", icon: "community" },
  { href: "/more", label: "더보기", icon: "more" },
] as const;

type AppShellProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  bottomAction?: ReactNode;
  children: ReactNode;
};

export function AppShell({ title, subtitle, action, bottomAction, children }: AppShellProps) {
  const pathname = usePathname();
  const { notifications } = usePetLog();
  const notificationCount = notifications.filter((n) => !n.isRead).length;
  const showBackButton = pathname !== "/";

  return (
    <main className="min-h-dvh bg-[radial-gradient(circle_at_top,#eef6e9_0,#f7f8f4_38%,#f2f3ee_100%)] text-[#20231f]">
      <div className="relative mx-auto flex h-dvh w-full max-w-[430px] flex-col overflow-hidden bg-[#f8faf5] shadow-[0_24px_80px_rgba(58,75,49,0.18)] md:my-6 md:h-[880px] md:rounded-[28px] md:border md:border-[#dce3d4]">
        <header className="z-20 shrink-0 border-b border-[#e0e6da] bg-[#f8faf5]/95 px-5 pb-4 pt-5 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {showBackButton ? (
                <button
                  aria-label="뒤로 가기"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dbe4d4] bg-white text-[#263022] shadow-sm"
                  onClick={() => window.history.back()}
                  type="button"
                >
                  <PetIcon className="h-5 w-5" name="back" />
                </button>
              ) : null}
              <div className="min-w-0">
                {subtitle ? <p className="text-xs font-semibold text-[#16804b]">{subtitle}</p> : null}
                <h1 className="mt-1 truncate text-xl font-bold text-[#1f2922]">{title}</h1>
              </div>
            </div>
            {action ?? (
              <Link
                aria-label="알림"
                className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full border border-[#dbe4d4] bg-white text-[#167947] shadow-sm"
                href="/notifications"
              >
                <PetIcon className="h-5 w-5" name="bell" />
                {notificationCount > 0 ? (
                  <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#be4c3c] px-1 text-[10px] font-black leading-none text-white">
                    {notificationCount > 9 ? "9+" : notificationCount}
                  </span>
                ) : null}
              </Link>
            )}
          </div>
        </header>

        <div className={`min-h-0 flex-1 overflow-y-auto px-5 pt-5 ${bottomAction ? "pb-5" : "pb-28"}`}>{children}</div>

        {bottomAction ? (
          <div className="z-20 shrink-0 bg-transparent px-5 pb-3 pt-3">
            {bottomAction}
          </div>
        ) : null}

        <nav className="z-30 shrink-0 border-t border-[#dfe6d9] bg-white/95 px-3 pb-3 pt-2 shadow-[0_-12px_30px_rgba(46,63,42,0.08)] backdrop-blur">
          <div className="grid grid-cols-5 gap-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[11px] font-semibold transition ${
                    isActive ? "bg-[#e3f3e8] text-[#0b7a43]" : "text-[#788276] hover:bg-[#f1f5ed]"
                  }`}
                  href={item.href}
                  key={item.href}
                >
                  <PetIcon className="h-5 w-5" name={item.icon} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <AskAiPanel hasBottomAction={!!bottomAction} />
      </div>
    </main>
  );
}

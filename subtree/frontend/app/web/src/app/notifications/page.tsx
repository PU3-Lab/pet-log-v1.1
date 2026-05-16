"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, Pill, SectionHeader } from "@/components/ui";
import { getCareNotificationHref } from "@/lib/action-navigation";
import { sortCareNotificationsByLatest } from "@/lib/notifications";
import type { CareNotificationCategory, CareNotificationTone } from "@/lib/types";

type NotificationFilter = "전체" | CareNotificationCategory;

const filters: NotificationFilter[] = ["전체", "기록", "주의", "행동 변화", "일정"];

const toneClasses: Record<CareNotificationTone, string> = {
  green: "bg-[#edf8ed] text-[#16804b]",
  orange: "bg-[#fff2df] text-[#bb721e]",
  red: "bg-[#ffe9e6] text-[#be4c3c]",
  blue: "bg-[#eaf2ff] text-[#2e67a7]",
};

const notificationBorderClasses: Partial<Record<CareNotificationTone, string>> = {
  orange: "pet-log-notification-alert-border pet-log-notification-alert-border-orange",
  red: "pet-log-notification-alert-border pet-log-notification-alert-border-red",
};

const notificationCategoryIcons: Record<CareNotificationCategory, "record" | "alert" | "behavior" | "schedule"> = {
  기록: "record",
  주의: "alert",
  "행동 변화": "behavior",
  일정: "schedule",
};

export default function NotificationsPage() {
  const { markAllNotificationsRead, markNotificationRead, notifications } = usePetLog();
  const [activeFilter, setActiveFilter] = useState<NotificationFilter>("전체");
  const readSummary = useMemo(() => {
    const total = notifications.length;
    const read = notifications.filter((n) => n.isRead).length;
    return { totalCount: total, readCount: read, unreadCount: total - read, hasUnread: read < total };
  }, [notifications]);
  const filteredNotifications = useMemo(() => {
    const latestNotifications = sortCareNotificationsByLatest(notifications);
    if (activeFilter === "전체") {
      return latestNotifications;
    }
    return latestNotifications.filter((notification) => notification.category === activeFilter);
  }, [activeFilter, notifications]);

  return (
    <AppShell subtitle="중요한 케어 신호" title="알림">
      <div className="space-y-5">
	        <Card className="bg-gradient-to-br from-white to-[#edf8ed]">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16804b]">
                <PetIcon className="h-4 w-4" name="bell" />
                오늘 확인할 알림
              </p>
              <h2 className="mt-1 text-2xl font-black text-[#1f2922]">읽지 않음 {readSummary.unreadCount}개</h2>
            </div>
            {readSummary.hasUnread ? (
              <button
                className="h-9 shrink-0 rounded-full border border-[#dbe4d4] bg-white px-3 text-xs font-black text-[#16804b] shadow-sm"
                onClick={() => markAllNotificationsRead(notifications.map((notification) => notification.id))}
                type="button"
              >
                모두 읽음
              </button>
            ) : null}
          </div>
	          <p className="mt-2 text-sm leading-6 text-[#667262]">
	            전체 {readSummary.totalCount}개 중 읽은 알림 {readSummary.readCount}개입니다.
	          </p>
	          <div className="mt-4 grid grid-cols-3 gap-2">
	            <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
                <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="bell" />
	              <p className="text-[11px] font-bold text-[#778174]">전체</p>
	              <p className="mt-1 text-base font-black text-[#1f2922]">{readSummary.totalCount}</p>
	            </div>
	            <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
                <PetIcon className="mx-auto h-4 w-4 text-[#be4c3c]" name="alert" />
	              <p className="text-[11px] font-bold text-[#778174]">읽지 않음</p>
	              <p className="mt-1 text-base font-black text-[#be4c3c]">{readSummary.unreadCount}</p>
	            </div>
	            <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
                <PetIcon className="mx-auto h-4 w-4 text-[#356aa8]" name={activeFilter === "전체" ? "more" : notificationCategoryIcons[activeFilter]} />
	              <p className="text-[11px] font-bold text-[#778174]">분류</p>
	              <p className="mt-1 truncate text-base font-black text-[#1f2922]">{activeFilter}</p>
	            </div>
	          </div>
	        </Card>

	        <div className="grid grid-cols-4 gap-2">
	          {filters.map((filter) => (
	            <Pill active={activeFilter === filter} className="w-full px-2 text-xs" key={filter} onClick={() => setActiveFilter(filter)}>
	              {filter}
	            </Pill>
	          ))}
        </div>

        <section>
          <SectionHeader title="알림 목록" />
          <div className="space-y-3">
            {filteredNotifications.map((notification) => (
              <Card
                className={
                  notification.isRead
                    ? "bg-white/70"
                    : `${notificationBorderClasses[notification.tone] ?? "border-[#b8dec4]"} bg-white`
                }
                key={notification.id}
              >
                <div className="flex gap-3">
                  <div
                    className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-sm font-black ${
                      notification.isRead ? "bg-[#f0f3ed] text-[#7d8879]" : toneClasses[notification.tone]
                    }`}
                  >
                    <PetIcon className="h-5 w-5" name={notificationCategoryIcons[notification.category]} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-base font-black text-[#1f2922]">{notification.title}</h2>
                      <span className="shrink-0 rounded-full bg-[#f0f3ed] px-2.5 py-1 text-[11px] font-bold text-[#667262]">
                        {notification.dueLabel}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span
                        className={`inline-flex h-7 items-center rounded-full px-2.5 text-[11px] font-black ${
                          notification.isRead ? "bg-[#f0f3ed] text-[#7d8879]" : "bg-[#e3f3e8] text-[#16804b]"
                        }`}
                      >
                        {notification.isRead ? "읽음" : "새 알림"}
                      </span>
                      {!notification.isRead ? (
                        <button
                          className="h-8 shrink-0 rounded-full border border-[#dbe4d4] px-3 text-xs font-bold text-[#16804b]"
                          onClick={() => markNotificationRead(notification.id)}
                          type="button"
                        >
                          읽음
                        </button>
                      ) : null}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[#667262]">{notification.detail}</p>
                    <Link
                      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#16804b] text-sm font-bold text-white"
                      href={getCareNotificationHref(notification)}
                      onClick={() => markNotificationRead(notification.id)}
                    >
                      <PetIcon className="h-4 w-4" name={notificationCategoryIcons[notification.category]} />
                      {notification.action}
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
            {filteredNotifications.length === 0 ? (
              <Card className="p-5 text-center">
                <h2 className="text-sm font-bold text-[#1f2922]">표시할 알림이 없습니다.</h2>
                <p className="mt-2 text-sm leading-6 text-[#667262]">다른 분류를 선택하거나 새 기록을 남겨보세요.</p>
              </Card>
            ) : null}
          </div>
        </section>

        <Card className="bg-[#fffaf0]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#b56d19]">
            <PetIcon className="h-4 w-4" name="alert" />
            안전 안내
          </p>
          <p className="mt-2 text-sm leading-6 text-[#65533a]">
            알림은 저장된 기록을 바탕으로 한 확인 요청입니다. 증상이 반복되거나 심해지면 병원 상담을 권장합니다.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

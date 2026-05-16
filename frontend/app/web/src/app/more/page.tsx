"use client";

import Image from "next/image";
import Link from "next/link";
import type { ComponentProps } from "react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetChatDialog } from "@/components/pet-chat-dialog";
import { usePetLog } from "@/components/pet-log-provider";
import { PetIcon } from "@/components/pet-icons";
import { Card, SectionHeader } from "@/components/ui";

type MenuIconName = ComponentProps<typeof PetIcon>["name"];

type MoreMenuItem = {
  href: string;
  label: string;
  detail: string;
  icon: MenuIconName;
  badge?: string;
};

const menuSections: Array<{ title: string; items: MoreMenuItem[] }> = [
  {
    title: "핵심 관리",
    items: [
      { href: "/profile", label: "프로필", detail: "사진, 체중, 특이사항", icon: "profile" },
      { href: "/timeline", label: "타임라인", detail: "날짜별 기록 확인", icon: "timeline" },
      { href: "/suggestions", label: "AI 제안", detail: "기록 기반 케어 가이드", icon: "suggestions" },
    ],
  },
  {
    title: "케어 운영",
    items: [
      { href: "/schedule", label: "일정", detail: "접종, 약, 검진 관리", icon: "schedule" },
      { href: "/notifications", label: "알림", detail: "오늘 확인할 케어 알림", icon: "bell" },
      { href: "/settings", label: "설정", detail: "AI 요약과 알림 선호", icon: "settings" },
    ],
  },
  {
    title: "확장 기능",
    items: [
      { href: "/shared-care", label: "공동 관리", detail: "보호자 초대와 알림 공유", icon: "shared", badge: "UI" },
      { href: "/hospital", label: "병원 연계", detail: "상담 준비 리포트", icon: "hospital", badge: "UI" },
      { href: "/shopping", label: "쇼핑", detail: "기록 기반 상품 후보", icon: "shopping", badge: "UI" },
    ],
  },
];

export default function MorePage() {
  const { profile, records, schedules } = usePetLog();
  const [isPetChatOpen, setIsPetChatOpen] = useState(false);
  const pendingSchedules = schedules.filter((schedule) => !schedule.isDone).length;
  const petChatName = profile.name.trim() || "꾸꾸";

  return (
    <AppShell subtitle="전체 메뉴" title="더보기">
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-[#edf8ed]">
          <div className="flex items-start gap-3">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#e6f3de] text-xl font-black text-[#16804b]">
              {profile.photoDataUrl ? (
                <Image
                  alt={`${profile.name} 프로필 사진`}
                  className="h-full w-full object-cover"
                  height={56}
                  src={profile.photoDataUrl}
                  unoptimized
                  width={56}
                />
              ) : (
                profile.name.slice(0, 1)
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#16804b]">관리 중인 반려동물</p>
              <h2 className="mt-1 truncate text-lg font-black text-[#1f2922]">{profile.name}</h2>
              <p className="mt-1 truncate text-sm font-semibold text-[#667262]">
                {profile.breed} · {profile.age} · {profile.weight}
              </p>
            </div>
            <button
              aria-label={`${petChatName}와의 대화`}
              className="pet-log-float-soft pet-log-pressable pet-log-chat-sparkle-border mt-1 inline-flex h-9 shrink-0 items-center justify-center gap-1 whitespace-nowrap rounded-full bg-[#1f2922] px-3 text-[12px] font-bold text-white shadow-[0_6px_14px_rgba(31,41,34,0.14)]"
              onClick={() => setIsPetChatOpen(true)}
              style={{ fontSize: 12 }}
              title={`${petChatName}와의 대화`}
              type="button"
            >
              <PetIcon className="h-4 w-4" name="chat" />
              <span>{petChatName}와의 대화</span>
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-2xl bg-white/80 px-3 py-3">
              <p className="text-[11px] font-bold text-[#778174]">저장된 기록</p>
              <p className="mt-1 text-base font-black text-[#1f2922]">{records.length}개</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-3">
              <p className="text-[11px] font-bold text-[#778174]">진행 중 일정</p>
              <p className="mt-1 text-base font-black text-[#1f2922]">{pendingSchedules}개</p>
            </div>
          </div>
        </Card>

        {menuSections.map((section) => (
          <section key={section.title}>
            <SectionHeader title={section.title} />
            <div className="grid grid-cols-1 gap-3">
              {section.items.map((item) => (
                <Link className="block" href={item.href} key={item.href}>
                  <Card className="p-4 transition hover:border-[#cddcc5] hover:bg-[#fbfdf8]">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#eef5e9] text-[#16804b]">
                          <PetIcon className="h-5 w-5" name={item.icon} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="text-sm font-black text-[#1f2922]">{item.label}</span>
                            {item.badge ? (
                              <span className="rounded-full bg-[#fff2df] px-2 py-0.5 text-[10px] font-black text-[#bb721e]">
                                {item.badge}
                              </span>
                            ) : null}
                          </span>
                          <span className="mt-1 block truncate text-xs font-semibold text-[#7c8777]">{item.detail}</span>
                        </span>
                      </div>
                      <span className="shrink-0 text-[#9ba597]">›</span>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <PetChatDialog
        isOpen={isPetChatOpen}
        onClose={() => setIsPetChatOpen(false)}
        profile={profile}
        records={records}
      />
    </AppShell>
  );
}

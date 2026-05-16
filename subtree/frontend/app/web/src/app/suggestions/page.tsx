"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { PetIcon } from "@/components/pet-icons";
import { usePetLog } from "@/components/pet-log-provider";
import { Card, Pill, SectionHeader } from "@/components/ui";
import { getCareSuggestionHref } from "@/lib/action-navigation";
import type { AiSuggestion, SuggestionCategory, SuggestionTone } from "@/lib/types";

type SuggestionFilter = "전체" | SuggestionCategory;

const toneClasses = {
  green: "bg-[#edf8ed] text-[#16804b]",
  orange: "bg-[#fff2df] text-[#bb721e]",
  blue: "bg-[#eaf2ff] text-[#2e67a7]",
};

const suggestionFilters: SuggestionFilter[] = ["전체", "행동", "건강", "생활"];

const suggestionCategoryIcons: Record<SuggestionCategory, "behavior" | "medical" | "heart"> = {
  행동: "behavior",
  건강: "medical",
  생활: "heart",
};

export default function SuggestionsPage() {
  const { records, settings, suggestions, isAnalysisLoading } = usePetLog();
  const [activeFilter, setActiveFilter] = useState<SuggestionFilter>("전체");
  
  const allSuggestions = useMemo(() => {
    if (!settings.aiInsightEnabled) return [];
    return suggestions.map((s, idx) => {
      const tone: SuggestionTone = s.severity === "alert" || s.severity === "notice" ? "orange" : "green";
      const category: SuggestionCategory =
        s.title.includes("행동") ? "행동"
        : s.title.includes("건강") || s.title.includes("의료") || s.title.includes("주의") ? "건강"
        : "생활";
      return {
        id: `suggestion-${idx}`,
        category,
        title: s.title,
        detail: s.reason,
        action: s.action,
        actionHref: getCareSuggestionHref(s, "/record"),
        tone,
      };
    });
  }, [suggestions, settings.aiInsightEnabled]);

  const filteredSuggestions = useMemo(() => {
    if (activeFilter === "전체") {
      return allSuggestions;
    }
    return allSuggestions.filter((suggestion) => suggestion.category === activeFilter);
  }, [activeFilter, allSuggestions]);
  
  const urgentSuggestionCount = allSuggestions.filter((suggestion) => suggestion.tone === "orange").length;

  return (
    <AppShell subtitle="맞춤형 행동 개선 가이드" title="제안">
      <div className="space-y-5">
        <Card className="bg-gradient-to-br from-white to-[#edf8ed]">
          <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16804b]">
            <PetIcon className="h-4 w-4" name="sparkle" />
            오늘의 케어 제안
            {isAnalysisLoading && <span className="pet-log-pulse-dot h-1.5 w-1.5 bg-[#16804b]" />}
          </p>
          <h2 className="mt-1 text-lg font-black text-[#1f2922]">기록에서 바로 이어지는 행동 가이드</h2>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
              <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="suggestions" />
              <p className="text-[11px] font-bold text-[#778174]">전체</p>
              <p className="mt-1 text-base font-black text-[#1f2922]">{allSuggestions.length}</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
              <PetIcon className="mx-auto h-4 w-4 text-[#bb721e]" name="alert" />
              <p className="text-[11px] font-bold text-[#778174]">확인</p>
              <p className="mt-1 text-base font-black text-[#bb721e]">{urgentSuggestionCount}</p>
            </div>
            <div className="rounded-2xl bg-white/80 px-3 py-3 text-center">
              <PetIcon className="mx-auto h-4 w-4 text-[#356aa8]" name={activeFilter === "전체" ? "more" : suggestionCategoryIcons[activeFilter]} />
              <p className="text-[11px] font-bold text-[#778174]">필터</p>
              <p className="mt-1 truncate text-base font-black text-[#1f2922]">{activeFilter}</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-4 gap-2">
          {suggestionFilters.map((filter) => (
            <Pill active={activeFilter === filter} className="w-full px-2 text-xs" key={filter} onClick={() => setActiveFilter(filter)}>
              {filter}
            </Pill>
          ))}
        </div>

        <section>
          <SectionHeader title="오늘의 제안" />
          <div className="space-y-3">
            {isAnalysisLoading && allSuggestions.length === 0 && (
              <Card className="flex items-center justify-center py-12" motion="rise">
                <div className="flex flex-col items-center gap-3">
                  <span className="pet-log-pulse-dot h-3 w-3 bg-[#16804b]" />
                  <p className="text-sm font-bold text-[#16804b]">AI가 최근 기록을 분석하고 있어요</p>
                </div>
              </Card>
            )}
            {!settings.aiInsightEnabled ? (
              <Card className="p-5 text-center">
                <h2 className="text-sm font-bold text-[#1f2922]">AI 제안이 꺼져 있습니다.</h2>
                <p className="mt-2 text-sm leading-6 text-[#667262]">설정에서 AI 요약과 케어 제안을 다시 켤 수 있습니다.</p>
                <Link
                  className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#16804b] px-5 text-sm font-bold text-white"
                  href="/settings"
                >
                  <PetIcon className="h-4 w-4" name="settings" />
                  설정 열기
                </Link>
              </Card>
            ) : null}
            {filteredSuggestions.map((suggestion) => (
              <Card key={suggestion.id}>
                <div className="flex gap-3">
                  <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-black ${toneClasses[suggestion.tone]}`}>
                    <PetIcon className="h-5 w-5" name={suggestionCategoryIcons[suggestion.category]} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base font-black text-[#1f2922]">{suggestion.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-[#667262]">{suggestion.detail}</p>
                    <Link
                      className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#16804b] text-sm font-bold text-white"
                      href={suggestion.actionHref}
                    >
                      <PetIcon className="h-4 w-4" name={suggestionCategoryIcons[suggestion.category]} />
                      {suggestion.action}
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
            {settings.aiInsightEnabled && filteredSuggestions.length === 0 ? (
              <Card className="p-5 text-center">
                <h2 className="text-sm font-bold text-[#1f2922]">표시할 제안이 없습니다.</h2>
                <p className="mt-2 text-sm leading-6 text-[#667262]">다른 카테고리를 선택해보세요.</p>
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
            반복되는 이상 증상이나 급격한 컨디션 변화는 기록을 모아 병원 상담을 권장합니다.
          </p>
        </Card>
      </div>
    </AppShell>
  );
}

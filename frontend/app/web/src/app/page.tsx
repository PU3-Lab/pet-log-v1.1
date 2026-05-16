"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { ChatTypingIndicator } from "@/components/chat-typing-indicator";
import { PetChatDialog } from "@/components/pet-chat-dialog";
import { usePetLog } from "@/components/pet-log-provider";
import { AiMascot, Card, CategoryBadge, SectionHeader } from "@/components/ui";
import { getRecentChange, getRecordStatusLabel, getTodaySummary, type HomeSummaryTone } from "@/lib/home-summary";
import { PetIcon } from "@/components/pet-icons";
import { sendChatbotMessage } from "@/lib/api-client";
import { getCareActionHref, getCareNotificationHref, getCareSuggestionHref } from "@/lib/action-navigation";
import { sortCareNotificationsByLatest } from "@/lib/notifications";
import { getTimelineFilterHref, getTimelineRecordHref } from "@/lib/timeline-navigation";
import type { ChatbotThread } from "@/lib/types";

type SpeechRecognitionEventLike = {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
};

type SpeechRecognitionErrorLike = {
  error?: string;
};

type PetLogSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: ((event: SpeechRecognitionErrorLike) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
};

type PetLogSpeechRecognitionConstructor = new () => PetLogSpeechRecognition;

declare global {
  interface Window {
    SpeechRecognition?: PetLogSpeechRecognitionConstructor;
    webkitSpeechRecognition?: PetLogSpeechRecognitionConstructor;
  }
}

const toneText: Record<HomeSummaryTone, string> = {
  green: "text-[#16804b]",
  orange: "text-[#a4651a]",
  red: "text-[#be4c3c]",
  blue: "text-[#356aa8]",
};

const toneDot: Record<HomeSummaryTone, string> = {
  green: "bg-[#16804b]",
  orange: "bg-[#d38a2d]",
  red: "bg-[#be4c3c]",
  blue: "bg-[#356aa8]",
};

const toneCard: Record<HomeSummaryTone, string> = {
  green: "border-[#d8ead1] bg-[#fbfff8]",
  orange: "border-[#f1d9af] bg-[#fffaf0]",
  red: "border-[#f0cbc5] bg-[#fff7f5]",
  blue: "border-[#d4e0f5] bg-[#f6f9ff]",
};

const homeNotificationBorderClasses: Partial<Record<HomeSummaryTone, string>> = {
  orange: "pet-log-notification-alert-border pet-log-notification-alert-border-orange",
  red: "pet-log-notification-alert-border pet-log-notification-alert-border-red",
};

const homeRecentChangeHospitalBorderClass = "pet-log-notification-alert-border pet-log-notification-alert-border-orange";

const severityToTone: Record<string, HomeSummaryTone> = {
  alert: "red",
  notice: "orange",
  info: "green",
};

const chatbotQuestions: Array<{ icon: "heart" | "bell" | "syringe"; text: string }> = [
  { icon: "heart", text: "오늘 상태 괜찮아?" },
  { icon: "bell", text: "주의 알림은 왜 떴어?" },
  { icon: "syringe", text: "백신 전에 확인할 게 있어?" },
];

const panelAnimationMs = 180;

export default function Home() {
  const { profile, records, schedules, settings, insights, suggestions, isAnalysisLoading, notifications } = usePetLog();
  const [isChatbotOpen, setIsChatbotOpen] = useState(false);
  const [isPetChatOpen, setIsPetChatOpen] = useState(false);
  const [chatbotQuestion, setChatbotQuestion] = useState("");
  const [chatbotNotice, setChatbotNotice] = useState("");
  const [isChatbotSending, setIsChatbotSending] = useState(false);
  const [isChatbotHistoryLoading] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [closingPanel, setClosingPanel] = useState<"chatbot" | null>(null);
  const [chatbotThread, setChatbotThread] = useState<ChatbotThread | null>(null);
  const chatbotScrollRef = useRef<HTMLDivElement | null>(null);
  const panelCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestRecords = records.slice(0, 3);
  const homeNotifications = useMemo(() => sortCareNotificationsByLatest(notifications).slice(0, 2), [notifications]);
  const todaySummary = getTodaySummary(records);
  
  // AI Insights mapping (Replacing legacy recentChange)
  const topInsight = insights[0];
  
  const recentChange = useMemo(() => {
    if (topInsight) {
      return {
        label: `AI 분석 · ${topInsight.severity === "alert" ? "주의" : topInsight.severity === "notice" ? "변화" : "안정"}`,
        title: topInsight.title,
        detail: topInsight.reason,
        tone: severityToTone[topInsight.severity] || "green"
      };
    }
    return getRecentChange(records);
  }, [topInsight, records]);

  // AI Suggestions mapping (Replacing legacy getAiCareSuggestions)
  const homeSuggestions = useMemo(() => {
    if (!settings.aiInsightEnabled) return [];
    return suggestions.slice(0, 2).map((s, idx) => ({
      id: `suggestion-${idx}`,
      category: "케어 가이드" as const,
      title: s.title,
      detail: s.reason,
      action: s.action,
      actionHref: getCareSuggestionHref(s, "/record"),
      tone: "green" as const
    }));
  }, [suggestions, settings.aiInsightEnabled]);

  const pendingSchedules = schedules.filter((schedule) => !schedule.isDone).length;
  const chatbotMessageCount = chatbotThread?.messages.length ?? 0;
  const recentChangeActionHref = topInsight ? getCareActionHref(topInsight.actionHref, "/timeline") : null;
  const recentChangeLinksToHospital = recentChangeActionHref?.split(/[?#]/)[0] === "/hospital";
  const recentChangeActionLabel = recentChangeLinksToHospital ? "병원 추천 보기" : "자세히 보기";
  const recentChangeBorderClass = recentChangeLinksToHospital
    ? (homeNotificationBorderClasses[recentChange.tone] ?? homeRecentChangeHospitalBorderClass)
    : `border-l-4 ${toneCard[recentChange.tone]}`;
  const recentChangeCard = (
    <Card className={`p-4 ${recentChangeBorderClass}`} interactive={Boolean(recentChangeActionHref)} motion="rise">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-xs font-bold ${toneText[recentChange.tone]} flex items-center gap-1.5`}>
            {recentChange.label}
            {isAnalysisLoading && <span className="pet-log-pulse-dot h-1.5 w-1.5 bg-current opacity-60" />}
          </p>
          <h3 className="mt-1 text-sm font-black text-[#1f2922]">{recentChange.title}</h3>
          <p className="mt-2 text-sm leading-6 text-[#62705f]">{recentChange.detail}</p>
          {recentChangeActionHref ? (
            <p className={`mt-3 text-xs font-black ${toneText[recentChange.tone]}`}>{recentChangeActionLabel}</p>
          ) : null}
        </div>
        <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toneDot[recentChange.tone]} ${recentChange.tone === "red" || recentChange.tone === "orange" ? "pet-log-pulse-dot" : ""}`} />
      </div>
    </Card>
  );

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("petChat") === "1") {
      searchParams.delete("petChat");
      const nextSearch = searchParams.toString();
      const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`;
      window.history.replaceState(null, "", nextUrl);
      const frameId = requestAnimationFrame(() => {
        setClosingPanel(null);
        setIsChatbotOpen(false);
        setIsPetChatOpen(true);
      });

      return () => cancelAnimationFrame(frameId);
    }

    return undefined;
  }, []);

  useEffect(() => {
    if (!isChatbotOpen) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const scrollContainer = chatbotScrollRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [chatbotMessageCount, chatbotNotice, isChatbotHistoryLoading, isChatbotOpen, isChatbotSending]);

  function clearPanelCloseTimer() {
    if (panelCloseTimerRef.current) {
      clearTimeout(panelCloseTimerRef.current);
      panelCloseTimerRef.current = null;
    }
  }

  function closeChatbot() {
    if (closingPanel === "chatbot") {
      return;
    }
    clearPanelCloseTimer();
    setClosingPanel("chatbot");
    panelCloseTimerRef.current = setTimeout(() => {
      setIsChatbotOpen(false);
      setClosingPanel((current) => (current === "chatbot" ? null : current));
      panelCloseTimerRef.current = null;
    }, panelAnimationMs);
  }

  async function askChatbot(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setChatbotNotice("궁금한 내용을 입력하거나 추천 질문을 선택해주세요.");
      return;
    }

    setIsChatbotSending(true);
    try {
      const response = await sendChatbotMessage(
        trimmedQuestion,
        latestRecords.map((record) => record.id),
        chatbotThread?.id,
      );
      setChatbotThread(response.thread ?? chatbotThread);
      setChatbotNotice("");
      setChatbotQuestion((current) => (current.trim() === trimmedQuestion ? "" : current));
    } catch {
      setChatbotNotice("답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsChatbotSending(false);
    }
  }

  function selectChatbotQuestion(question: string) {
    setChatbotQuestion(question);
    void askChatbot(question);
  }

  function submitChatbotQuestion() {
    void askChatbot(chatbotQuestion);
  }

  function startChatbotVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setChatbotNotice("이 브라우저에서는 음성 입력을 지원하지 않습니다.");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "ko-KR";
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onresult = (event) => {
        const transcript = event.results[0]?.[0]?.transcript.trim();
        if (!transcript) {
          return;
        }
        setChatbotQuestion((current) => {
          const trimmedCurrent = current.trim();
          return trimmedCurrent ? `${trimmedCurrent} ${transcript}` : transcript;
        });
        setChatbotNotice("");
      };
      recognition.onerror = (event) => {
        const message = event.error === "not-allowed" ? "마이크 권한을 허용해야 음성 입력을 사용할 수 있습니다." : "음성을 인식하지 못했습니다. 다시 시도해주세요.";
        setChatbotNotice(message);
      };
      recognition.onend = () => {
        setIsVoiceListening(false);
      };
      setIsVoiceListening(true);
      recognition.start();
    } catch {
      setIsVoiceListening(false);
      setChatbotNotice("음성 입력을 시작하지 못했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <AppShell
      action={
        <Link
          aria-label="기록 추가"
          className="pet-log-pressable grid h-10 w-10 place-items-center rounded-full bg-[#16804b] text-white shadow-sm"
          href="/record"
        >
          <PetIcon className="h-5 w-5" name="plus" />
        </Link>
      }
      subtitle="AI가 먼저 케어해주는 홈"
      title={`${profile.name}의 오늘`}
    >
      <div className="space-y-5">
        <Card className="relative overflow-hidden p-4" motion="rise">
          <div className="absolute right-0 -top-12 h-24 w-24 rounded-full bg-[#e9f6df]" />
          <div className="relative grid grid-cols-[52px_1fr_auto] items-center gap-3">
            <div className="grid h-12 w-12 place-items-center overflow-hidden rounded-2xl bg-[#eaf5e5] text-xl font-black text-[#16804b]">
              {profile.photoDataUrl ? (
                <Image
                  alt={`${profile.name} 프로필 사진`}
                  className="h-full w-full object-cover"
                  height={48}
                  src={profile.photoDataUrl}
                  unoptimized
                  width={48}
                />
              ) : (
                profile.name.slice(0, 1)
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-black text-[#1f2922]">{profile.name}</p>
                <span className="rounded-full bg-[#f0f3ed] px-2.5 py-1 text-[11px] font-bold text-[#5e6859]">
                  {profile.breed}
                </span>
                <span className="rounded-full bg-[#f0f3ed] px-2.5 py-1 text-[11px] font-bold text-[#5e6859]">
                  {profile.age}
                </span>
              </div>
              <p className="mt-2 truncate text-sm font-semibold text-[#667262]">
                {profile.weight} · {profile.notes[0] ?? profile.personality}
              </p>
            </div>
            <Link className="rounded-full bg-[#edf8ed] px-3 py-2 text-xs font-black text-[#16804b]" href="/profile">
              보기
            </Link>
          </div>
          <div className="relative mt-4 grid grid-cols-3 gap-2">
            <Link aria-label="최근 기록 보기" className="pet-log-pressable rounded-2xl bg-[#f4f7f0] px-3 py-3 text-center" href="/timeline">
              <PetIcon className="mx-auto h-4 w-4 text-[#16804b]" name="record" />
              <p className="text-[11px] font-bold text-[#778174]">최근 기록</p>
              <p className="mt-1 text-base font-black text-[#1f2922]">{latestRecords.length}</p>
            </Link>
            <Link aria-label="오늘 알림 보기" className="pet-log-pressable rounded-2xl bg-[#fffaf0] px-3 py-3 text-center" href="/notifications">
              <PetIcon className="mx-auto h-4 w-4 text-[#a4651a]" name="bell" />
              <p className="text-[11px] font-bold text-[#778174]">오늘 알림</p>
              <p className="mt-1 text-base font-black text-[#1f2922]">{notifications.length}</p>
            </Link>
            <Link aria-label="일정 보기" className="pet-log-pressable rounded-2xl bg-[#f6f9ff] px-3 py-3 text-center" href="/schedule">
              <PetIcon className="mx-auto h-4 w-4 text-[#356aa8]" name="schedule" />
              <p className="text-[11px] font-bold text-[#778174]">일정</p>
              <p className="mt-1 text-base font-black text-[#1f2922]">{pendingSchedules}</p>
            </Link>
          </div>
        </Card>

        {settings.aiInsightEnabled ? (
          <Card className="bg-gradient-to-br from-white to-[#edf8ed]" motion="rise">
            <div className="flex gap-3">
              <AiMascot active />
              <div className="min-w-0 flex-1">
                <p className="inline-flex items-center gap-1.5 text-sm font-bold text-[#16804b]">
                  <PetIcon className="h-4 w-4" name="sparkle" />
                  AI 질문
                </p>
                <h2 className="mt-1 text-lg font-bold leading-7 text-[#1f2922]">오늘 배변 상태는 어땠나요?</h2>
                <p className="mt-2 text-sm leading-6 text-[#62705f]">어제 기록이 비어 있어 변화 판단에 필요합니다.</p>
                <Link
                  className="pet-log-pressable mt-4 inline-flex h-10 items-center rounded-xl bg-[#16804b] px-5 text-sm font-bold text-white"
                  href="/record"
                >
                  기록하기
                </Link>
              </div>
            </div>
          </Card>
        ) : null}

        <section>
          <SectionHeader
            action={
              <Link className="inline-flex h-8 items-center rounded-full px-2 text-xs font-bold text-[#16804b]" href="/notifications">
                전체 보기
              </Link>
            }
            title="오늘 알림"
          />
          <div className="space-y-3">
            {homeNotifications.map((notification) => (
              <Link
                aria-label={`${notification.title} ${notification.action}`}
                className="block"
                href={getCareNotificationHref(notification)}
                key={notification.id}
              >
                <Card
                  className={`p-4 ${homeNotificationBorderClasses[notification.tone] ?? `border-l-4 ${toneCard[notification.tone]}`}`}
                  interactive
                  motion="rise"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`text-xs font-bold ${toneText[notification.tone]}`}>
                        {notification.category} · {notification.dueLabel}
                      </p>
                      <h3 className="mt-1 text-sm font-bold text-[#1f2922]">{notification.title}</h3>
                      <p className="mt-1 text-xs leading-5 text-[#667262]">{notification.detail}</p>
                      <p className="mt-2 text-[11px] font-black text-[#16804b]">{notification.action}</p>
                    </div>
                    <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${toneDot[notification.tone]} ${notification.tone === "red" || notification.tone === "orange" ? "pet-log-pulse-dot" : ""}`} />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="오늘 요약" />
          <div className="grid grid-cols-3 gap-2">
            {todaySummary.map((item) => (
              <Link aria-label={`${item.label} 기록 보기`} className="block" href={getTimelineFilterHref(item.category)} key={item.category}>
                <Card className={`p-3 text-center ${toneCard[item.tone]}`} interactive motion="rise">
                  <PetIcon className={`mx-auto mb-1 h-4 w-4 ${toneText[item.tone]}`} name={item.category} />
                  <p className="text-xs font-bold text-[#788276]">{item.label}</p>
                  <p className="mt-2 truncate text-sm font-black text-[#1f2922]">{item.value}</p>
                  <p className={`mt-1 text-[11px] font-semibold ${toneText[item.tone]}`}>{item.state}</p>
                </Card>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionHeader title="최근 변화" />
          {recentChangeActionHref ? (
            <Link aria-label={`${recentChange.title} ${recentChangeActionLabel}`} className="block" href={recentChangeActionHref}>
              {recentChangeCard}
            </Link>
          ) : (
            recentChangeCard
          )}
        </section>

        {settings.aiInsightEnabled ? (
          <section>
            <SectionHeader
              action={
                <Link className="inline-flex h-8 items-center rounded-full px-2 text-xs font-bold text-[#16804b]" href="/suggestions">
                  더보기
                </Link>
              }
              title="AI 제안"
            />
            <div className="space-y-3">
              {isAnalysisLoading && homeSuggestions.length === 0 && (
                <Card className="flex items-center justify-center py-8" motion="rise">
                  <div className="flex flex-col items-center gap-2">
                    <span className="pet-log-pulse-dot h-2 w-2 bg-[#16804b]" />
                    <p className="text-xs font-bold text-[#16804b]">AI가 최근 기록을 분석하고 있어요</p>
                  </div>
                </Card>
              )}
              {homeSuggestions.map((suggestion) => (
                <Link
                  aria-label={`${suggestion.title} ${suggestion.action}`}
                  className="block"
                  href={suggestion.actionHref}
                  key={suggestion.id}
                >
                  <Card className="p-4" interactive motion="rise">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#16804b]">{suggestion.category}</p>
                        <h3 className="mt-1 font-bold text-[#1f2922]">{suggestion.title}</h3>
                        <p className="mt-2 text-sm leading-6 text-[#62705f]">{suggestion.detail}</p>
                        <p className="mt-3 text-xs font-black text-[#16804b]">{suggestion.action}</p>
                      </div>
                      <PetIcon className="mt-0.5 h-5 w-5 shrink-0 text-[#16804b]" name="sparkle" />
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <SectionHeader title="오늘 할 일" />
          <Card motion="rise">
            <p className="text-center text-sm text-[#7b8576]">오늘 할 일이 없습니다.</p>
          </Card>
        </section>

        <section>
          <SectionHeader
            action={
              <Link className="inline-flex h-8 items-center rounded-full px-2 text-xs font-bold text-[#16804b]" href="/timeline">
                전체 보기
              </Link>
            }
            title="최근 기록"
          />
          <div className="space-y-3">
            {latestRecords.length > 0 ? (
              latestRecords.map((record) => (
                <Link aria-label={`${record.title} 기록 보기`} className="block" href={getTimelineRecordHref(record.id)} key={record.id}>
                  <Card className="p-4" interactive motion="rise">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <CategoryBadge category={record.category} />
                          <span className="text-xs font-semibold text-[#8a9286]">{record.time}</span>
                        </div>
                        <p className="mt-2 truncate text-sm font-bold text-[#1f2922]">{record.title}</p>
                        <p className={`mt-1 text-xs font-bold ${toneText[getRecordStatusLabel(record).tone]}`}>
                          {getRecordStatusLabel(record).label}
                        </p>
                      </div>
                      <span className="text-[#9ba597]">›</span>
                    </div>
                  </Card>
                </Link>
              ))
            ) : (
                <Card className="p-4" motion="rise">
                <p className="text-sm font-bold text-[#1f2922]">아직 최근 기록이 없습니다.</p>
                <p className="mt-1 text-sm leading-6 text-[#667262]">첫 기록을 저장하면 여기에 바로 표시됩니다.</p>
              </Card>
            )}
          </div>
        </section>
      </div>

      <PetChatDialog
        isOpen={isPetChatOpen}
        onClose={() => setIsPetChatOpen(false)}
        profile={profile}
        records={records}
      />

      {isChatbotOpen ? (
        <div
          className={`absolute inset-0 z-40 overflow-hidden bg-[#1f2922]/45 backdrop-blur-[1px] ${
            closingPanel === "chatbot" ? "pet-log-backdrop-out" : "pet-log-backdrop-in"
          }`}
          onClick={closeChatbot}
        >
          <section
            aria-label="AI에게 물어보기"
            aria-modal="true"
            className={`absolute bottom-0 left-0 top-0 flex w-full flex-col border-r border-[#dce8d4] bg-white px-5 pb-5 pt-5 shadow-[18px_0_48px_rgba(31,41,34,0.2)] ${
              closingPanel === "chatbot" ? "pet-log-panel-out-left" : "pet-log-panel-in-left"
            }`}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="shrink-0 border-b border-[#e5eadf] bg-white pb-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-[#1f2922]">AI에게 물어보기</h2>
                  <p className="mt-2 text-sm font-semibold leading-6 text-[#667262]">
                    {profile.name}의 기록을 참고해서 답변해드려요
                  </p>
                </div>
                <button
                  aria-label="물어보기 닫기"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0f3ed] text-[#5e6859]"
                  onClick={closeChatbot}
                  type="button"
                >
                  <PetIcon className="h-4 w-4" name="close" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-4" ref={chatbotScrollRef}>
              <div className="space-y-2">
                {chatbotQuestions.map((question) => (
                  <button
                    className="flex h-12 w-full items-center gap-3 rounded-full border border-[#dfe6d9] bg-[#fbfdf8] px-4 text-left text-sm font-bold text-[#40513f] shadow-[0_4px_14px_rgba(49,65,44,0.04)]"
                    disabled={isChatbotSending}
                    key={question.text}
                    onClick={() => selectChatbotQuestion(question.text)}
                    type="button"
                  >
                    <PetIcon className="h-5 w-5 shrink-0 text-[#16804b]" name={question.icon} />
                    <span className="min-w-0 truncate">{question.text}</span>
                  </button>
                ))}
              </div>

              {isChatbotHistoryLoading ? (
                <p className="mt-4 rounded-2xl bg-[#f4f7f0] px-4 py-3 text-xs font-bold leading-5 text-[#667262]">최근 대화를 불러오는 중입니다.</p>
              ) : null}

              {chatbotThread && chatbotThread.messages.length > 0 ? (
                <div className="mt-4 space-y-2" aria-label="최근 대화">
                  {chatbotThread.messages.slice(-8).map((message) => (
                    <div
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 shadow-sm ${
                        message.role === "user"
                          ? "ml-auto bg-[#16804b] text-white"
                          : "mr-auto border border-[#dfe8d9] bg-[#fbfdf8] text-[#334032]"
                      }`}
                      key={message.id}
                    >
                      <p className="break-words">{message.content}</p>
                      {message.role === "assistant" && message.safetyNotice ? (
                        <p className="mt-2 border-t border-[#dfe8d9] pt-2 text-[11px] font-bold leading-5 text-[#667262]">{message.safetyNotice}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {isChatbotSending ? <ChatTypingIndicator label="AI 답변 대기 중" /> : null}

              {chatbotNotice ? (
                <p className="mt-4 rounded-2xl bg-[#edf8ed] px-4 py-3 text-xs font-bold leading-5 text-[#16804b]">{chatbotNotice}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#dfe6d9] bg-white px-4 py-2 shadow-sm">
              <input
                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#263022] outline-none placeholder:text-[#9aa494]"
                onChange={(event) => {
                  setChatbotQuestion(event.target.value);
                  if (chatbotNotice) {
                    setChatbotNotice("");
                  }
                }}
                placeholder={`${profile.name}에 대해 궁금한 걸 물어보세요`}
                value={chatbotQuestion}
              />
              <button
                aria-label={isVoiceListening ? "음성 입력 듣는 중" : "음성 입력 시작"}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
                  isVoiceListening
                    ? "border-[#16804b] bg-[#e7f4eb] text-[#16804b]"
                    : "border-[#d8e2d2] bg-[#f6f8f3] text-[#667262] disabled:text-[#a9b2a5]"
                }`}
                disabled={isChatbotSending || isVoiceListening}
                onClick={startChatbotVoiceInput}
                title="음성 입력"
                type="button"
              >
                <PetIcon className="h-5 w-5" name="mic" />
              </button>
              <button
                aria-label="질문 보내기"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#16804b] text-white disabled:bg-[#8ab99f]"
                disabled={isChatbotSending}
                onClick={submitChatbotQuestion}
                type="button"
              >
                <PetIcon className="h-5 w-5" name="send" />
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </AppShell>
  );
}

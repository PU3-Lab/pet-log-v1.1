"use client";

import { useEffect, useRef, useState } from "react";
import { askCareAnswer } from "@/lib/api-client";
import type { ChatbotMessage, ChatbotThread } from "@/lib/types";
import { ChatTypingIndicator } from "./chat-typing-indicator";
import { usePetLog } from "./pet-log-provider";
import { PetIcon } from "./pet-icons";

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

const chatbotQuestions: Array<{ icon: "heart" | "bell" | "syringe"; text: string }> = [
  { icon: "heart", text: "오늘 상태 괜찮아?" },
  { icon: "bell", text: "주의 알림은 왜 떴어?" },
  { icon: "syringe", text: "백신 전에 확인할 게 있어?" },
];

const panelAnimationMs = 180;

export function AskAiPanel({ hasBottomAction = false }: { hasBottomAction?: boolean }) {
  const { profile } = usePetLog();
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [question, setQuestion] = useState("");
  const [notice, setNotice] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [thread, setThread] = useState<ChatbotThread | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageIdRef = useRef(0);
  const messageCount = thread?.messages.length ?? 0;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const frameId = requestAnimationFrame(() => {
      const scrollContainer = scrollRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [messageCount, notice, isOpen, isSending]);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function openPanel() {
    clearCloseTimer();
    setIsClosing(false);
    setIsOpen(true);
  }

  function closePanel() {
    if (isClosing) {
      return;
    }
    clearCloseTimer();
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
      closeTimerRef.current = null;
    }, panelAnimationMs);
  }

  async function ask(questionText: string) {
    const trimmedQuestion = questionText.trim();
    if (!trimmedQuestion) {
      setNotice("궁금한 내용을 입력하거나 추천 질문을 선택해주세요.");
      return;
    }

    setIsSending(true);
    try {
      const response = await askCareAnswer(trimmedQuestion, profile.id);
      appendCareAnswerExchange(trimmedQuestion, response.answer, response.referencedRecordIds, response.safetyNotice);
      setNotice("");
      setQuestion((current) => (current.trim() === trimmedQuestion ? "" : current));
    } catch {
      setNotice("답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSending(false);
    }
  }

  function appendCareAnswerExchange(
    userQuestion: string,
    answer: string,
    referencedRecordIds: string[] = [],
    safetyNotice = "",
  ) {
    const now = new Date().toISOString();
    messageIdRef.current += 1;
    const exchangeId = messageIdRef.current;
    const userMessage: ChatbotMessage = {
      id: `care-user-${exchangeId}`,
      role: "user",
      content: userQuestion,
      createdAt: now,
      referencedRecordIds: [],
    };
    const assistantMessage: ChatbotMessage = {
      id: `care-assistant-${exchangeId}`,
      role: "assistant",
      content: answer,
      createdAt: now,
      referencedRecordIds,
      safetyNotice,
    };

    setThread((current) => {
      const nextThread: ChatbotThread =
        current ??
        {
          id: `care-thread-${Date.now()}`,
          title: userQuestion.slice(0, 24) || "AI 질문",
          createdAt: now,
          updatedAt: now,
          messages: [],
        };

      return {
        ...nextThread,
        updatedAt: now,
        messages: [...nextThread.messages, userMessage, assistantMessage].slice(-12),
      };
    });
  }

  function startVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setNotice("이 브라우저에서는 음성 입력을 지원하지 않습니다.");
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
        setQuestion((current) => {
          const trimmedCurrent = current.trim();
          return trimmedCurrent ? `${trimmedCurrent} ${transcript}` : transcript;
        });
        setNotice("");
      };
      recognition.onerror = (event) => {
        const message = event.error === "not-allowed" ? "마이크 권한을 허용해야 음성 입력을 사용할 수 있습니다." : "음성을 인식하지 못했습니다. 다시 시도해주세요.";
        setNotice(message);
      };
      recognition.onend = () => {
        setIsVoiceListening(false);
      };
      setIsVoiceListening(true);
      recognition.start();
    } catch {
      setIsVoiceListening(false);
      setNotice("음성 입력을 시작하지 못했습니다. 다시 시도해주세요.");
    }
  }

  return (
    <>
      {!isOpen ? (
        <button
          aria-haspopup="dialog"
          className={`pet-log-float-soft pet-log-pressable absolute right-5 z-30 inline-flex h-14 items-center gap-2 rounded-full bg-[#16804b] px-5 text-sm font-black text-white shadow-[0_12px_28px_rgba(22,128,75,0.32)] ${
            hasBottomAction ? "bottom-36" : "bottom-20"
          }`}
          onClick={openPanel}
          type="button"
        >
          <PetIcon className="h-5 w-5" name="question" />
          물어보기
        </button>
      ) : null}

      {isOpen ? (
        <div
          className={`absolute inset-0 z-40 overflow-hidden bg-[#1f2922]/45 backdrop-blur-[1px] ${
            isClosing ? "pet-log-backdrop-out" : "pet-log-backdrop-in"
          }`}
          onClick={closePanel}
        >
          <section
            aria-label="AI에게 물어보기"
            aria-modal="true"
            className={`absolute bottom-0 left-0 top-0 flex w-full flex-col border-r border-[#dce8d4] bg-white px-5 pb-5 pt-5 shadow-[18px_0_48px_rgba(31,41,34,0.2)] ${
              isClosing ? "pet-log-panel-out-left" : "pet-log-panel-in-left"
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
                  onClick={closePanel}
                  type="button"
                >
                  <PetIcon className="h-4 w-4" name="close" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-4" ref={scrollRef}>
              <div className="space-y-2">
                {chatbotQuestions.map((item) => (
                  <button
                    className="flex h-12 w-full items-center gap-3 rounded-full border border-[#dfe6d9] bg-[#fbfdf8] px-4 text-left text-sm font-bold text-[#40513f] shadow-[0_4px_14px_rgba(49,65,44,0.04)]"
                    disabled={isSending}
                    key={item.text}
                    onClick={() => {
                      setQuestion(item.text);
                      void ask(item.text);
                    }}
                    type="button"
                  >
                    <PetIcon className="h-5 w-5 shrink-0 text-[#16804b]" name={item.icon} />
                    <span className="min-w-0 truncate">{item.text}</span>
                  </button>
                ))}
              </div>

              {thread && thread.messages.length > 0 ? (
                <div className="mt-4 space-y-2" aria-label="최근 대화">
                  {thread.messages.slice(-8).map((message) => (
                    <div
                      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 shadow-sm ${
                        message.role === "user"
                          ? "ml-auto bg-[#16804b] text-white"
                          : "mr-auto border border-[#dfe8d9] bg-[#fbfdf8] text-[#334032]"
                      }`}
                      key={message.id}
                    >
                      <p className="whitespace-pre-line break-words">{message.content}</p>
                      {message.role === "assistant" && message.safetyNotice ? (
                        <p className="mt-2 border-t border-[#dfe8d9] pt-2 text-[11px] font-bold leading-5 text-[#667262]">{message.safetyNotice}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : null}

              {isSending ? <ChatTypingIndicator label="AI 답변 대기 중" /> : null}

              {notice ? (
                <p className="mt-4 rounded-2xl bg-[#edf8ed] px-4 py-3 text-xs font-bold leading-5 text-[#16804b]">{notice}</p>
              ) : null}
            </div>

            <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#dfe6d9] bg-white px-4 py-2 shadow-sm">
              <input
                className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#263022] outline-none placeholder:text-[#9aa494]"
                onChange={(event) => {
                  setQuestion(event.target.value);
                  if (notice) {
                    setNotice("");
                  }
                }}
                placeholder={`${profile.name}에 대해 궁금한 걸 물어보세요`}
                value={question}
              />
              <button
                aria-label={isVoiceListening ? "음성 입력 듣는 중" : "음성 입력 시작"}
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-full border ${
                  isVoiceListening
                    ? "border-[#16804b] bg-[#e7f4eb] text-[#16804b]"
                    : "border-[#d8e2d2] bg-[#f6f8f3] text-[#667262] disabled:text-[#a9b2a5]"
                }`}
                disabled={isSending || isVoiceListening}
                onClick={startVoiceInput}
                title="음성 입력"
                type="button"
              >
                <PetIcon className="h-5 w-5" name="mic" />
              </button>
              <button
                aria-label="질문 보내기"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#16804b] text-white disabled:bg-[#8ab99f]"
                disabled={isSending}
                onClick={() => void ask(question)}
                type="button"
              >
                <PetIcon className="h-5 w-5" name="send" />
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

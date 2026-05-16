"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChatTypingIndicator } from "@/components/chat-typing-indicator";
import { PetIcon } from "@/components/pet-icons";
import { askPetChat } from "@/lib/api-client";
import type { PetProfile, RecordEntry } from "@/lib/types";

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

const petChatQuestions = ["오늘 기분 어때?", "밥은 맛있었어?", "산책 또 가고 싶어?"];
const panelAnimationMs = 180;

type PetChatMessage = {
  id: string;
  role: "user" | "pet";
  content: string;
};

export function PetChatDialog({
  isOpen,
  profile,
  records,
  onClose,
}: {
  isOpen: boolean;
  profile: PetProfile;
  records: RecordEntry[];
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [notice, setNotice] = useState("");
  const [messages, setMessages] = useState<PetChatMessage[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isVoiceListening, setIsVoiceListening] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const messageIdRef = useRef(0);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const frameId = requestAnimationFrame(() => {
      const scrollContainer = scrollRef.current;
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, [isOpen, messages.length, notice, isSending]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  function closeDialog() {
    if (isClosing) {
      return;
    }
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
    }
    setIsClosing(true);
    closeTimerRef.current = setTimeout(() => {
      onClose();
      setIsClosing(false);
      closeTimerRef.current = null;
    }, panelAnimationMs);
  }

  async function sendMessage(question: string) {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setNotice(`${profile.name}에게 하고 싶은 말을 입력해주세요.`);
      return;
    }

    messageIdRef.current += 1;
    const messageId = messageIdRef.current;
    const userMessage: PetChatMessage = {
      id: `pet-user-${messageId}`,
      role: "user",
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage].slice(-12));
    setIsSending(true);

    try {
      const response = await askPetChat(trimmedQuestion, profile.id);
      const petMessage: PetChatMessage = {
        id: `pet-reply-${messageId}`,
        role: "pet",
        content: response.answer,
      };

      setMessages((current) => [...current, petMessage].slice(-12));
      setInput("");
      setNotice(response.safetyNotice || "");
    } catch {
      setNotice("대화 답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSending(false);
    }
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
        setInput((current) => {
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

  if (!isOpen) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 z-40 overflow-hidden bg-[#1f2922]/45 backdrop-blur-[1px] ${isClosing ? "pet-log-backdrop-out" : "pet-log-backdrop-in"}`}
      onClick={closeDialog}
    >
      <section
        aria-label="펫과 대화"
        aria-modal="true"
        className={`absolute bottom-0 right-0 top-0 flex w-full flex-col border-l border-[#dce8d4] bg-[#fffdf7] px-5 pb-5 pt-5 shadow-[-18px_0_48px_rgba(31,41,34,0.2)] ${
          isClosing ? "pet-log-panel-out-right" : "pet-log-panel-in-right"
        }`}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="shrink-0 border-b border-[#e5eadf] bg-[#fffdf7] pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl bg-white text-lg font-black text-[#16804b] shadow-inner">
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
                <h2 className="text-xl font-black text-[#1f2922]">{profile.name}와 대화</h2>
                <p className="mt-1 text-sm font-semibold leading-6 text-[#667262]">기록을 바탕으로 일상 대화를 나눠요</p>
              </div>
            </div>
            <button
              aria-label="펫 대화 닫기"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#f0f3ed] text-[#5e6859]"
              onClick={closeDialog}
              type="button"
            >
              <PetIcon className="h-4 w-4" name="close" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pb-3 pt-4" ref={scrollRef}>
          <div className="space-y-2">
            {petChatQuestions.map((question) => (
              <button
                className="flex h-12 w-full items-center gap-3 rounded-full border border-[#dfe6d9] bg-white px-4 text-left text-sm font-bold text-[#40513f] shadow-[0_4px_14px_rgba(49,65,44,0.04)]"
                disabled={isSending}
                key={question}
                onClick={() => void sendMessage(question)}
                type="button"
              >
                <PetIcon className="h-5 w-5 shrink-0 text-[#16804b]" name="heart" />
                <span className="min-w-0 truncate">{question}</span>
              </button>
            ))}
          </div>

          <div className="mt-4 space-y-2" aria-label="펫 대화 내용">
            <div className="mr-auto max-w-[92%] rounded-2xl border border-[#dfe8d9] bg-white px-4 py-3 text-sm font-semibold leading-6 text-[#334032] shadow-sm">
              <p className="break-words">나한테 말 걸어줘서 좋아. 오늘 있었던 일도 같이 얘기해보자.</p>
            </div>
            {messages.map((message) => (
              <div
                className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm font-semibold leading-6 shadow-sm ${
                  message.role === "user" ? "ml-auto bg-[#1f2922] text-white" : "mr-auto border border-[#dfe8d9] bg-white text-[#334032]"
                }`}
                key={message.id}
              >
                <p className="whitespace-pre-line break-words">{message.content}</p>
              </div>
            ))}
            {isSending ? <ChatTypingIndicator label={`${profile.name} 답변 대기 중`} /> : null}
          </div>

          {notice ? (
            <p className="mt-4 rounded-2xl bg-[#edf8ed] px-4 py-3 text-xs font-bold leading-5 text-[#16804b]">{notice}</p>
          ) : null}

          <p className="mt-4 rounded-2xl bg-[#f4f7f0] px-4 py-3 text-[11px] font-bold leading-5 text-[#667262]">
            {profile.name}처럼 말하지만 진단은 아니에요. 아픈 상태가 반복되면 AI 질문이나 병원 상담으로 확인해주세요.
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-full border border-[#dfe6d9] bg-white px-4 py-2 shadow-sm">
          <input
            className="h-10 min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#263022] outline-none placeholder:text-[#9aa494]"
            onChange={(event) => {
              setInput(event.target.value);
              if (notice) {
                setNotice("");
              }
            }}
            placeholder={`${profile.name}에게 말 걸기`}
            value={input}
          />
          <button
            aria-label={isVoiceListening ? "펫 대화 음성 입력 듣는 중" : "펫 대화 음성 입력 시작"}
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
            aria-label="펫 대화 보내기"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#1f2922] text-white disabled:bg-[#7c847f]"
            disabled={isSending}
            onClick={() => void sendMessage(input)}
            type="button"
          >
            <PetIcon className="h-5 w-5" name="send" />
          </button>
        </div>
      </section>
    </div>
  );
}

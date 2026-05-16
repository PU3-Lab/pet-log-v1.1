import { categoryLabels } from "./record-constants";
import type { RecordCategory, RecordCategoryChoice, StructuredRecord } from "./types";

export type RecordInputMode = "text" | "voice" | "photo";

export type RecordInputModeStatus = "available" | "coming-soon";

export type RecordInputModeFeedback = {
  status: RecordInputModeStatus;
  label: string;
  detail: string;
};

export type RecordPreviewRequestState = {
  hasActivePet: boolean;
  isCorrectingTranscription: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  isVoiceInputFinalizing: boolean;
  trimmedDetail: string;
};

export type BrowserSpeechRecognitionResult = {
  isFinal: boolean;
  0?: {
    transcript: string;
  };
};

export type BrowserSpeechRecognitionResultEvent = {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: BrowserSpeechRecognitionResult;
  };
};

export type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: BrowserSpeechRecognitionResultEvent) => void) | null;
  start: () => void;
  stop: () => void;
};

export type BrowserSpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export type BrowserSpeechRecognitionWindow = {
  SpeechRecognition?: BrowserSpeechRecognitionConstructor;
  webkitSpeechRecognition?: BrowserSpeechRecognitionConstructor;
};

export const recordInputFlow = ["category", "mode", "entry", "ai-preview", "recent-records"] as const;

export const defaultRecordCategoryChoice: RecordCategoryChoice = "all";

const defaultVoicePromptPetName = "꾸꾸";

function resolveVoicePromptPetName(petName: string) {
  return petName.trim() || defaultVoicePromptPetName;
}

export function getVoiceRecordStartPrompt(petName: string) {
  return `${resolveVoicePromptPetName(petName)}의 오늘을 들려주세요`;
}

export function getVoiceRecordCompletePrompt(petName: string) {
  return `${resolveVoicePromptPetName(petName)}의 하루를 정리하고 있어요`;
}

export function getRecordSaveProcessingPrompt(petName: string) {
  return `${resolveVoicePromptPetName(petName)}의 기록을 정리하고 있어요`;
}

export const recordCategoryChoiceOptions = [
  { icon: "record", label: "AI 자동", value: "all", hint: "내용 기준" },
  { icon: "meal", label: "식사", value: "meal", hint: "먹은 양" },
  { icon: "walk", label: "산책", value: "walk", hint: "시간/거리" },
  { icon: "stool", label: "배변", value: "stool", hint: "횟수/상태" },
  { icon: "medical", label: "병원/약", value: "medical", hint: "약/진료" },
  { icon: "behavior", label: "행동", value: "behavior", hint: "감정/반응" },
] as const satisfies ReadonlyArray<{
  icon: "record" | RecordCategory;
  label: string;
  value: RecordCategoryChoice;
  hint: string;
}>;

export function resolveRecordCategoryForSave(choice: RecordCategoryChoice, structured: StructuredRecord): RecordCategory {
  return choice === "all" ? structured.suggestedCategory : choice;
}

export function getRecordCategoryChoiceLabel(choice: RecordCategoryChoice): string {
  return recordCategoryChoiceOptions.find((option) => option.value === choice)?.label ?? "";
}

const inputModeFeedback: Record<RecordInputMode, RecordInputModeFeedback> = {
  text: {
    status: "available",
    label: "바로 입력",
    detail: "자연어로 식사, 산책, 배변, 행동을 한 번에 적으면 AI가 구조화합니다.",
  },
  voice: {
    status: "available",
    label: "녹음",
    detail: "마이크로 녹음한 뒤 종료하면 자동으로 텍스트 변환해 기록 입력창에 채웁니다.",
  },
  photo: {
    status: "coming-soon",
    label: "준비 중",
    detail: "사진 첨부와 인식은 준비 중입니다. 사진과 함께 남길 메모를 먼저 입력할 수 있습니다.",
  },
};

export function getInputModeFeedback(mode: RecordInputMode) {
  return inputModeFeedback[mode];
}

export function getRecordTextAreaClassName(isCleaningRecordText: boolean) {
  const baseClassName =
    "min-h-40 w-full resize-none rounded-2xl border border-[#dde6d6] bg-[#fbfcfa] p-4 text-sm leading-6 outline-none placeholder:text-[#8a9286]";
  const stateClassName = isCleaningRecordText
    ? "read-only:cursor-not-allowed read-only:bg-[#f6f8f4]"
    : "focus:border-[#16804b] focus:ring-2 focus:ring-[#16804b]/15";

  return `${baseClassName} ${stateClassName}`;
}

export function getVoiceRecordButtonClassName({
  isCleaningRecordText,
  isRecording,
}: {
  isCleaningRecordText: boolean;
  isRecording: boolean;
}) {
  const stateClassName = isCleaningRecordText
    ? "pet-log-loading-border pet-log-text-cleaning-button-border border-transparent bg-white text-[#16804b]"
    : isRecording
      ? "border-[#be4c3c] bg-[#fff1ee] text-[#be4c3c]"
      : "border-[#cfe2cd] bg-white text-[#16804b]";

  return `pet-log-pressable mt-3 flex min-h-12 w-full items-center justify-center rounded-xl border px-4 text-sm font-bold ${stateClassName}`;
}

export function isRecordTextCleaning(
  state: Pick<RecordPreviewRequestState, "isCorrectingTranscription" | "isTranscribing">,
) {
  return state.isTranscribing || state.isCorrectingTranscription;
}

export function resolveMeasurementCategory(label: string): RecordCategory | null {
  const found = Object.entries(categoryLabels).find(([, categoryLabel]) => categoryLabel === label.trim());
  return found ? (found[0] as RecordCategory) : null;
}

export function getMeasurementPreviewGridClassName() {
  return "mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2";
}

export function getMeasurementPreviewTileClassName() {
  return "min-w-0 rounded-xl bg-[#f4f7f0] px-3 py-2.5";
}

export function getMeasurementPreviewValueClassName() {
  return "mt-2 break-words text-sm font-black leading-5 text-[#1f2922] [overflow-wrap:anywhere]";
}

export function getRecordPreviewSummaryText(
  normalizedSummary: string,
  fallbackTitle: string,
  suggestedCategory: RecordCategory,
) {
  const categoryLabel = categoryLabels[suggestedCategory];
  const summary = normalizedSummary.trim();
  if (summary === categoryLabel) {
    return "";
  }
  if (summary && summary !== categoryLabel) {
    return summary;
  }

  const fallback = fallbackTitle.trim();
  return fallback === categoryLabel ? "" : fallback;
}

export function shouldRequestRecordPreview(state: RecordPreviewRequestState) {
  return (
    !!state.trimmedDetail &&
    state.hasActivePet &&
    !state.isRecording &&
    !state.isTranscribing &&
    !state.isCorrectingTranscription &&
    !state.isVoiceInputFinalizing
  );
}

export function getBrowserSpeechRecognitionConstructor(
  windowLike: BrowserSpeechRecognitionWindow = globalThis as BrowserSpeechRecognitionWindow,
) {
  return windowLike.SpeechRecognition ?? windowLike.webkitSpeechRecognition ?? null;
}

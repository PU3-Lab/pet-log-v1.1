import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  defaultRecordCategoryChoice,
  getBrowserSpeechRecognitionConstructor,
  getInputModeFeedback,
  getRecordCategoryChoiceLabel,
  getMeasurementPreviewGridClassName,
  getMeasurementPreviewTileClassName,
  getMeasurementPreviewValueClassName,
  getRecordPreviewSummaryText,
  getRecordSaveProcessingPrompt,
  getRecordTextAreaClassName,
  getVoiceRecordButtonClassName,
  getVoiceRecordCompletePrompt,
  getVoiceRecordStartPrompt,
  isRecordTextCleaning,
  recordCategoryChoiceOptions,
  recordInputFlow,
  resolveMeasurementCategory,
  resolveRecordCategoryForSave,
  shouldRequestRecordPreview,
  type BrowserSpeechRecognition,
} from "./record-input";

const recordPageSource = readFileSync(resolve(process.cwd(), "src/app/record/page.tsx"), "utf8");

assert.deepEqual(recordInputFlow, ["category", "mode", "entry", "ai-preview", "recent-records"]);
assert.equal(defaultRecordCategoryChoice, "all");
assert.deepEqual(
  recordCategoryChoiceOptions.slice(0, 2).map((option) => [option.label, option.value]),
  [
    ["AI 자동", "all"],
    ["식사", "meal"],
  ],
);
assert.equal(getRecordCategoryChoiceLabel("all"), "AI 자동");
assert.equal(getRecordCategoryChoiceLabel("walk"), "산책");
assert.equal(
  resolveRecordCategoryForSave("all", {
    sourceText: "아침 사료를 먹었어",
    normalizedSummary: "아침 식사",
    suggestedCategory: "meal",
    confidence: 0.86,
    measurements: [],
    needsConfirmation: false,
  }),
  "meal",
);
assert.equal(
  resolveRecordCategoryForSave("walk", {
    sourceText: "아침 사료를 먹었어",
    normalizedSummary: "아침 식사",
    suggestedCategory: "meal",
    confidence: 0.86,
    measurements: [],
    needsConfirmation: false,
  }),
  "walk",
);

const textMode = getInputModeFeedback("text");
assert.equal(textMode.status, "available");
assert.ok(textMode.detail.includes("자연어"));

const voiceMode = getInputModeFeedback("voice");
assert.equal(voiceMode.status, "available");
assert.equal(voiceMode.label, "녹음");
assert.ok(voiceMode.detail.includes("마이크"));
assert.equal(getVoiceRecordStartPrompt("코코"), "코코의 오늘을 들려주세요");
assert.equal(getVoiceRecordCompletePrompt("코코"), "코코의 하루를 정리하고 있어요");
assert.equal(getRecordSaveProcessingPrompt("코코"), "코코의 기록을 정리하고 있어요");
assert.equal(getVoiceRecordStartPrompt("  "), "꾸꾸의 오늘을 들려주세요");
assert.ok(recordPageSource.includes("await speakVoicePrompt(getVoiceRecordStartPrompt(profile.name))"));
assert.ok(recordPageSource.includes("void speakVoicePrompt(getVoiceRecordCompletePrompt(profile.name))"));
assert.ok(recordPageSource.includes("preloadCachedSpeechAudio(getRecordSaveProcessingPrompt(profile.name), synthesizeSpeech)"));
assert.ok(recordPageSource.includes("void speakVoicePrompt(getRecordSaveProcessingPrompt(profile.name))"));

const photoMode = getInputModeFeedback("photo");
assert.equal(photoMode.status, "coming-soon");
assert.ok(photoMode.detail.includes("메모"));

assert.ok(getRecordTextAreaClassName(false).includes("border-[#dde6d6]"));
assert.ok(getRecordTextAreaClassName(true).includes("border-[#dde6d6]"));
assert.ok(getRecordTextAreaClassName(true).includes("read-only:cursor-not-allowed"));
assert.ok(!getRecordTextAreaClassName(true).includes("pet-log-text-correction-border"));
assert.ok(getVoiceRecordButtonClassName({ isCleaningRecordText: true, isRecording: false }).includes("pet-log-loading-border"));
assert.ok(getVoiceRecordButtonClassName({ isCleaningRecordText: true, isRecording: false }).includes("pet-log-text-cleaning-button-border"));
assert.ok(!getVoiceRecordButtonClassName({ isCleaningRecordText: false, isRecording: false }).includes("pet-log-loading-border"));
assert.equal(isRecordTextCleaning({ isCorrectingTranscription: false, isTranscribing: true }), true);
assert.equal(isRecordTextCleaning({ isCorrectingTranscription: true, isTranscribing: false }), true);
assert.equal(isRecordTextCleaning({ isCorrectingTranscription: false, isTranscribing: false }), false);
assert.equal(resolveMeasurementCategory("식사"), "meal");
assert.equal(resolveMeasurementCategory("산책"), "walk");
assert.equal(resolveMeasurementCategory("측정값"), null);
assert.ok(getMeasurementPreviewGridClassName().includes("grid-cols-1"));
assert.ok(getMeasurementPreviewGridClassName().includes("sm:grid-cols-2"));
assert.ok(getMeasurementPreviewTileClassName().includes("min-w-0"));
assert.ok(getMeasurementPreviewTileClassName().includes("rounded-xl"));
assert.ok(getMeasurementPreviewValueClassName().includes("break-words"));
assert.ok(getMeasurementPreviewValueClassName().includes("[overflow-wrap:anywhere]"));
assert.equal(getRecordPreviewSummaryText("식사", "아침 사료", "meal"), "");
assert.equal(getRecordPreviewSummaryText("아침 사료 45g", "아침 사료", "meal"), "아침 사료 45g");
assert.ok(recordPageSource.includes("<CategoryBadge category={measurementCategory} />"));
assert.ok(recordPageSource.includes("<dd className={getMeasurementPreviewValueClassName()}>{measurement.value}</dd>"));
assert.ok(!recordPageSource.includes("<CategoryBadge category={displayPreview.suggestedCategory} />"));
assert.ok(!recordPageSource.includes(".map((detectedCategory) =>"));

class NativeSpeechRecognition implements BrowserSpeechRecognition {
  continuous = false;
  interimResults = false;
  lang = "";
  onend = null;
  onerror = null;
  onresult = null;
  start() {}
  stop() {}
}

class WebkitSpeechRecognition extends NativeSpeechRecognition {}

assert.equal(
  getBrowserSpeechRecognitionConstructor({
    SpeechRecognition: NativeSpeechRecognition,
    webkitSpeechRecognition: WebkitSpeechRecognition,
  }),
  NativeSpeechRecognition,
);
assert.equal(getBrowserSpeechRecognitionConstructor({ webkitSpeechRecognition: WebkitSpeechRecognition }), WebkitSpeechRecognition);
assert.equal(getBrowserSpeechRecognitionConstructor({}), null);

assert.equal(
  shouldRequestRecordPreview({
    hasActivePet: true,
    isCorrectingTranscription: false,
    isRecording: false,
    isTranscribing: false,
    isVoiceInputFinalizing: false,
    trimmedDetail: "아침 사료 50g 먹었어",
  }),
  true,
);
assert.equal(
  shouldRequestRecordPreview({
    hasActivePet: true,
    isCorrectingTranscription: false,
    isRecording: true,
    isTranscribing: false,
    isVoiceInputFinalizing: false,
    trimmedDetail: "아침 사료",
  }),
  false,
);
assert.equal(
  shouldRequestRecordPreview({
    hasActivePet: true,
    isCorrectingTranscription: false,
    isRecording: false,
    isTranscribing: true,
    isVoiceInputFinalizing: false,
    trimmedDetail: "아침 사료",
  }),
  false,
);
assert.equal(
  shouldRequestRecordPreview({
    hasActivePet: true,
    isCorrectingTranscription: true,
    isRecording: false,
    isTranscribing: false,
    isVoiceInputFinalizing: false,
    trimmedDetail: "아침 사료",
  }),
  false,
);
assert.equal(
  shouldRequestRecordPreview({
    hasActivePet: true,
    isCorrectingTranscription: false,
    isRecording: false,
    isTranscribing: false,
    isVoiceInputFinalizing: true,
    trimmedDetail: "아침 사료",
  }),
  false,
);

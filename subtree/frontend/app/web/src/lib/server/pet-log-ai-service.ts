import axios from "axios";
import { structureRecord } from "@/lib/ai-insights";
import { categoryLabels } from "@/lib/record-constants";
import type {
  PetLogState,
  ExtractedMeasurement,
  PetProfile,
  RecordCategory,
  RecordCategoryChoice,
  RecordEntry,
  StructuredRecord,
} from "@/lib/types";

export type PetLogAiProviderId = "mock" | "openai";

export type ChatbotMessageResult = {
  answer: string;
  referencedRecordIds: string[];
  safetyNotice: string;
};

type CreateChatbotMessageInput = {
  question: string;
  contextRecordIds?: string[];
  state: PetLogState;
};

type CreateStructuredRecordInput = {
  detail: string;
  fallbackCategory: RecordCategoryChoice;
};

type OpenAiResponsesResult = {
  output_text?: unknown;
  output?: Array<{
    content?: Array<{
      text?: unknown;
    }>;
  }>;
};

const safetyNotice =
  "이 답변은 저장된 기록 기반 참고 안내이며 진단이 아닙니다. 증상이 지속되거나 심해지면 병원 상담을 권장합니다.";
const recordCategories: RecordCategory[] = ["meal", "walk", "stool", "medical", "behavior"];
const recordStatusLabels = {
  normal: "안정",
  notice: "확인 필요",
  alert: "주의",
} as const;

function getProviderId(): PetLogAiProviderId {
  return process.env.PET_LOG_AI_PROVIDER === "openai" ? "openai" : "mock";
}

function selectReferenceRecords(records: RecordEntry[], contextRecordIds: string[] = []) {
  if (contextRecordIds.length > 0) {
    return records.filter((record) => contextRecordIds.includes(record.id)).slice(0, 3);
  }

  return records.slice(0, 3);
}

function createMockChatbotMessage(question: string, referencedRecords: RecordEntry[]): ChatbotMessageResult {
  const trimmedQuestion = question.trim();
  const latestRecord = referencedRecords[0];
  const recordHint = latestRecord
    ? `최근 "${latestRecord.title}" 기록을 함께 봤습니다.`
    : "아직 참고할 최근 기록이 많지 않습니다.";

  return {
    answer: `${trimmedQuestion || "질문"}에 대해 확인했어요. ${recordHint} 지금 단계에서는 기록을 이어서 남기고 변화가 반복되는지 보는 것이 좋습니다.`,
    referencedRecordIds: referencedRecords.map((record) => record.id),
    safetyNotice,
  };
}

function createOpenAiPrompt(profile: PetProfile, question: string, referencedRecords: RecordEntry[]) {
  const records = referencedRecords.map((record) => ({
    id: record.id,
    date: record.date,
    time: record.time,
    category: record.category,
    categoryLabel: categoryLabels[record.category],
    title: record.title,
    detail: record.detail,
    status: record.status,
    statusLabel: recordStatusLabels[record.status],
    structured: record.structured,
  }));

  return [
    `반려동물: ${profile.name} / ${profile.breed} / ${profile.age} / ${profile.weight}`,
    `보호자 질문: ${question.trim()}`,
    `최근 참고 기록 JSON: ${JSON.stringify(records)}`,
    "한국어로 2~4문장만 답하세요.",
  ].join("\n");
}

function extractOpenAiText(result: OpenAiResponsesResult) {
  if (typeof result.output_text === "string" && result.output_text.trim()) {
    return result.output_text.trim();
  }

  const text = result.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => (typeof content.text === "string" ? content.text : ""))
    .join(" ")
    .trim();

  return text || "";
}

function isRecordCategory(value: unknown): value is RecordCategory {
  return recordCategories.includes(value as RecordCategory);
}

function createOpenAiStructurePrompt(detail: string, fallbackCategory: RecordCategoryChoice) {
  return [
    `원문: ${detail.trim()}`,
    `보호자가 선택한 기본 카테고리: ${fallbackCategory}`,
    "카테고리는 meal, walk, stool, medical, behavior 중 하나만 사용하세요.",
    "원문에 여러 카테고리가 함께 있으면 detectedCategories 배열에 등장 순서대로 모두 담으세요.",
    "수치가 있으면 label/value 배열로 추출하세요. label 예시는 급여량, 체중, 시간, 횟수입니다.",
    "JSON 객체만 반환하세요.",
  ].join("\n");
}

function parseOpenAiStructuredRecord(text: string, detail: string, fallbackCategory: RecordCategoryChoice): StructuredRecord | null {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    const parsed = JSON.parse(text.slice(firstBrace, lastBrace + 1)) as Partial<StructuredRecord>;
    const measurements = Array.isArray(parsed.measurements)
      ? parsed.measurements
          .filter(
            (measurement): measurement is ExtractedMeasurement =>
              !!measurement &&
              typeof measurement === "object" &&
              typeof measurement.label === "string" &&
              typeof measurement.value === "string",
          )
          .slice(0, 4)
      : [];
    const confidence = typeof parsed.confidence === "number" ? Math.min(0.99, Math.max(0.1, parsed.confidence)) : 0.45;
    const suggestedCategory = isRecordCategory(parsed.suggestedCategory)
      ? parsed.suggestedCategory
      : structureRecord(detail, fallbackCategory).suggestedCategory;
    const detectedCategories = Array.isArray(parsed.detectedCategories)
      ? parsed.detectedCategories.filter(isRecordCategory)
      : structureRecord(detail, fallbackCategory).detectedCategories;

    return {
      sourceText: typeof parsed.sourceText === "string" && parsed.sourceText.trim() ? parsed.sourceText.trim() : detail.trim(),
      normalizedSummary:
        typeof parsed.normalizedSummary === "string" && parsed.normalizedSummary.trim()
          ? parsed.normalizedSummary.trim().slice(0, 80)
          : structureRecord(detail, fallbackCategory).normalizedSummary,
      suggestedCategory,
      detectedCategories,
      confidence,
      measurements,
      needsConfirmation:
        typeof parsed.needsConfirmation === "boolean"
          ? parsed.needsConfirmation
          : confidence < 0.7 || (fallbackCategory !== "all" && suggestedCategory !== fallbackCategory),
    };
  } catch {
    return null;
  }
}

async function createOpenAiStructuredRecord(input: CreateStructuredRecordInput): Promise<StructuredRecord> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when PET_LOG_AI_PROVIDER=openai");
  }

  const endpoint = process.env.PET_LOG_OPENAI_RESPONSES_URL ?? "https://api.openai.com/v1/responses";
  const model = process.env.PET_LOG_OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await axios.post<OpenAiResponsesResult>(
    endpoint,
    {
      model,
      instructions:
        "너는 Pet Log의 기록 구조화 AI입니다. 보호자 원문을 보존하고, 확실하지 않은 분류나 낮은 신뢰도는 확인 필요로 표시하세요. 확정 진단이나 의학적 판단을 하지 마세요.",
      input: createOpenAiStructurePrompt(input.detail, input.fallbackCategory),
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const text = extractOpenAiText(response.data);
  const structured = parseOpenAiStructuredRecord(text, input.detail, input.fallbackCategory);
  if (!structured) {
    throw new Error("OpenAI response did not include a valid structured record");
  }

  return structured;
}

async function createOpenAiChatbotMessage(
  question: string,
  profile: PetProfile,
  referencedRecords: RecordEntry[],
): Promise<ChatbotMessageResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required when PET_LOG_AI_PROVIDER=openai");
  }

  const endpoint = process.env.PET_LOG_OPENAI_RESPONSES_URL ?? "https://api.openai.com/v1/responses";
  const model = process.env.PET_LOG_OPENAI_MODEL ?? "gpt-4o-mini";
  const response = await axios.post<OpenAiResponsesResult>(
    endpoint,
    {
      model,
      instructions:
        "너는 Pet Log의 반려동물 케어 보조 AI입니다. 저장된 기록만 근거로 삼고, 확정 진단이나 처방을 하지 마세요. 이상 증상이 지속, 악화, 반복되면 병원 상담을 권장하세요.",
      input: createOpenAiPrompt(profile, question, referencedRecords),
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  const answer = extractOpenAiText(response.data);
  if (!answer) {
    throw new Error("OpenAI response did not include answer text");
  }

  return {
    answer,
    referencedRecordIds: referencedRecords.map((record) => record.id),
    safetyNotice,
  };
}

export async function createPetLogStructuredRecord(input: CreateStructuredRecordInput): Promise<StructuredRecord> {
  if (getProviderId() !== "openai") {
    return structureRecord(input.detail, input.fallbackCategory);
  }

  try {
    return await createOpenAiStructuredRecord(input);
  } catch {
    return structureRecord(input.detail, input.fallbackCategory);
  }
}

export async function createPetLogChatbotMessage(input: CreateChatbotMessageInput): Promise<ChatbotMessageResult> {
  const referencedRecords = selectReferenceRecords(input.state.records, input.contextRecordIds);

  if (getProviderId() !== "openai") {
    return createMockChatbotMessage(input.question, referencedRecords);
  }

  try {
    return await createOpenAiChatbotMessage(input.question, input.state.profile, referencedRecords);
  } catch {
    return createMockChatbotMessage(input.question, referencedRecords);
  }
}

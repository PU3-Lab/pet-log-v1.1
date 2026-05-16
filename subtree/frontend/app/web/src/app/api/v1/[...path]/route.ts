import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import {
  appendMockChatbotExchange,
  createMockChatbotThread,
  getMockChatbotThreads,
  getMockPetLogState,
  updateMockExpansionState,
  updateMockSettings,
} from "@/lib/server/mock-pet-log-store";
import { createPetLogChatbotMessage } from "@/lib/server/pet-log-ai-service";
import {
  ExtractedMeasurement,
  RecordCategory,
  RecordCategoryChoice,
  RecordEntry,
  RecordStatus,
  StructuredRecord,
} from "@/lib/types";
import { structureRecord } from "@/lib/ai-insights";
import { categoryLabels } from "@/lib/record-constants";

type RouteContext = {
  params: Promise<{
    path?: string[];
  }>;
};

const recordCategories: RecordCategory[] = ["meal", "walk", "stool", "medical", "behavior"];
const recordStatuses: RecordStatus[] = ["normal", "notice", "alert"];
const defaultBackendApiBaseUrl = "http://127.0.0.1:27893";
const defaultBackendPetId = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";
const defaultBackendTimeoutMs = 60000;

type BackendPetLogCandidate = {
  title?: unknown;
  detail?: unknown;
  category?: unknown;
  status?: unknown;
  confidence?: unknown;
  needs_confirmation?: unknown;
  measurements?: unknown;
};

type BackendPetLogRecord = {
  id?: unknown;
  category?: unknown;
  title?: unknown;
  detail?: unknown;
  status?: unknown;
  recorded_at?: unknown;
  batch_id?: unknown;
};

type BackendRecordEntry = {
  id?: unknown;
  date?: unknown;
  time?: unknown;
  category?: unknown;
  title?: unknown;
  detail?: unknown;
  status?: unknown;
};

type BackendPetLogResult = {
  candidates?: unknown;
  saved_records?: unknown;
  needs_confirmation?: unknown;
};

class BackendRouteError extends Error {
  status: number;
  code: string;

  constructor(code: string, message: string, status = 502) {
    super(message);
    this.name = "BackendRouteError";
    this.code = code;
    this.status = status;
  }
}

function ok<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

function fail(code: string, message: string, status = 400) {
  return NextResponse.json({ ok: false, error: { code, message } }, { status });
}

function hasNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function mockCurrentUser() {
  return {
    id: "local-user",
    email: "local@example.com",
    name: "로컬 사용자",
  };
}

function mockPets() {
  const { profile } = getMockPetLogState();
  return {
    pets: [
      {
        ...profile,
        id: profile.id ?? backendPetId(),
      },
    ],
  };
}

function currentMockProfile() {
  return getMockPetLogState().profile;
}

function profileNameFallback() {
  return currentMockProfile().name.trim() || "반려동물";
}

function profileBreedFallback() {
  return currentMockProfile().breed.trim() || "미등록";
}

function resolveProfileName(value: unknown) {
  return hasNonEmptyString(value) ? value.trim() : profileNameFallback();
}

function resolveProfileBreed(value: unknown) {
  return hasNonEmptyString(value) ? value.trim() : profileBreedFallback();
}

function isRecordCategory(value: unknown): value is RecordCategory {
  return recordCategories.includes(value as RecordCategory);
}

function isRecordCategoryChoice(value: unknown): value is RecordCategoryChoice {
  return value === "all" || isRecordCategory(value);
}

function isRecordStatus(value: unknown): value is RecordStatus {
  return recordStatuses.includes(value as RecordStatus);
}

async function readJson(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getPath(context: RouteContext) {
  const params = await context.params;
  return params.path ?? [];
}

function isSpeechTranscriptionPath(path: string[]) {
  return path[0] === "speech" && path[1] === "transcriptions" && path.length === 2;
}

function isSpeechSynthesisPath(path: string[]) {
  return path[0] === "speech" && path[1] === "synthesis" && path.length === 2;
}

function isSpeechTextCorrectionPath(path: string[]) {
  return path[0] === "speech" && path[1] === "text-corrections" && path.length === 2;
}

function backendApiUrl(path: string) {
  const baseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL ?? defaultBackendApiBaseUrl;
  return `${baseUrl.replace(/\/$/, "")}${path}`;
}

function backendPetId() {
  return process.env.PET_LOG_BACKEND_PET_ID ?? defaultBackendPetId;
}

function backendTimeoutMs() {
  const configured = Number(process.env.PET_LOG_BACKEND_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : defaultBackendTimeoutMs;
}

function backendShoppingTimeoutMs() {
  const configured = Number(process.env.PET_LOG_SHOPPING_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 180000;
}

function backendAiTimeoutMs() {
  const configured = Number(process.env.PET_LOG_AI_TIMEOUT_MS);
  return Number.isFinite(configured) && configured > 0 ? configured : 180000;
}

function formatBackendDateLabel(recordedAt: string) {
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function formatBackendTimeLabel(recordedAt: string) {
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function mapBackendMeasurements(measurements: unknown): ExtractedMeasurement[] {
  if (!Array.isArray(measurements)) {
    return [];
  }

  return measurements
    .map((measurement) => {
      if (typeof measurement === "string" && measurement.trim()) {
        return { label: "측정값", value: measurement.trim() };
      }

      if (
        measurement &&
        typeof measurement === "object" &&
        typeof (measurement as ExtractedMeasurement).label === "string" &&
        typeof (measurement as ExtractedMeasurement).value === "string"
      ) {
        return {
          label: (measurement as ExtractedMeasurement).label.trim() || "측정값",
          value: (measurement as ExtractedMeasurement).value.trim(),
        };
      }

      return null;
    })
    .filter((measurement): measurement is ExtractedMeasurement => !!measurement && !!measurement.value)
    .slice(0, 4);
}

function withMeasurementCategoryLabel(measurement: ExtractedMeasurement, category: RecordCategory): ExtractedMeasurement {
  return {
    label: categoryLabels[category],
    value: measurement.value,
  };
}

function behaviorMeasurementFallback(candidate: BackendPetLogCandidate): ExtractedMeasurement[] {
  const detail = typeof candidate.detail === "string" ? candidate.detail.trim() : "";
  const title = typeof candidate.title === "string" ? candidate.title.trim() : "";
  const value = detail && detail !== categoryLabels.behavior ? detail : title;

  return value && value !== categoryLabels.behavior ? [{ label: categoryLabels.behavior, value }] : [];
}

function groupMeasurementsByLabel(measurements: ExtractedMeasurement[]): ExtractedMeasurement[] {
  return measurements
    .reduce<Array<{ label: string; values: string[] }>>((groups, measurement) => {
      const label = measurement.label.trim();
      const value = measurement.value.trim();
      if (!label || !value) {
        return groups;
      }

      const groupIndex = groups.findIndex((group) => group.label === label);
      if (groupIndex < 0) {
        return [...groups, { label, values: [value] }];
      }

      const group = groups[groupIndex];
      if (group.values.includes(value)) {
        return groups;
      }

      return groups.map((item, index) => (index === groupIndex ? { ...item, values: [...item.values, value] } : item));
    }, [])
    .map((group) => ({ label: group.label, value: group.values.join(" · ") }))
    .slice(0, 4);
}

function firstBackendCandidate(result: BackendPetLogResult): BackendPetLogCandidate | null {
  if (!Array.isArray(result.candidates)) {
    return null;
  }

  const candidate = result.candidates[0];
  return candidate && typeof candidate === "object" ? (candidate as BackendPetLogCandidate) : null;
}

function backendCandidateCategories(result: BackendPetLogResult): RecordCategory[] {
  if (!Array.isArray(result.candidates)) {
    return [];
  }

  return result.candidates.reduce<RecordCategory[]>((categories, candidate) => {
    const category =
      candidate && typeof candidate === "object" ? (candidate as BackendPetLogCandidate).category : null;
    if (!isRecordCategory(category) || categories.includes(category)) {
      return categories;
    }
    return [...categories, category];
  }, []);
}

function backendSavedRecords(result: BackendPetLogResult): BackendPetLogRecord[] {
  if (!Array.isArray(result.saved_records)) {
    return [];
  }

  return result.saved_records.filter(
    (record): record is BackendPetLogRecord => !!record && typeof record === "object",
  );
}

function backendCandidates(result: BackendPetLogResult): BackendPetLogCandidate[] {
  if (!Array.isArray(result.candidates)) {
    return [];
  }

  return result.candidates.filter(
    (candidate): candidate is BackendPetLogCandidate => !!candidate && typeof candidate === "object",
  );
}

function backendCandidateMeasurements(result: BackendPetLogResult): ExtractedMeasurement[] {
  const measurements = backendCandidates(result)
    .flatMap((candidate) => {
      const category = candidate.category;
      const measurements = mapBackendMeasurements(candidate.measurements);
      if (category === "behavior" && measurements.length === 0) {
        return behaviorMeasurementFallback(candidate);
      }
      return isRecordCategory(category)
        ? measurements.map((measurement) => withMeasurementCategoryLabel(measurement, category))
        : measurements;
    });

  return groupMeasurementsByLabel(measurements);
}

function uniqueValues(values: string[]) {
  return values.reduce<string[]>((unique, value) => {
    const trimmed = value.trim();
    if (!trimmed || unique.includes(trimmed)) {
      return unique;
    }
    return [...unique, trimmed];
  }, []);
}

function strongestRecordStatus(records: Array<{ status?: unknown }>): RecordStatus {
  const statuses = records.map((record) => record.status).filter(isRecordStatus);
  if (statuses.includes("alert")) {
    return "alert";
  }
  if (statuses.includes("notice")) {
    return "notice";
  }
  return "normal";
}

function mapBackendSavedRecordsToEntries(
  result: BackendPetLogResult,
  detail: string,
  categoryChoice: RecordCategoryChoice,
): RecordEntry[] {
  const savedRecords = backendSavedRecords(result);
  const candidates = backendCandidates(result);
  const fallback: RecordCategory = categoryChoice === "all" ? "meal" : categoryChoice;

  return savedRecords.flatMap((record, index): RecordEntry[] => {
    const candidate = candidates[index] ?? null;
    const structured: StructuredRecord = candidate
      ? mapBackendCandidateToStructured(candidate, detail, categoryChoice, false)
      : {
          sourceText: typeof record.detail === "string" ? record.detail : detail,
          normalizedSummary: typeof record.title === "string" ? record.title : detail.slice(0, 80),
          suggestedCategory: isRecordCategory(record.category) ? record.category : fallback,
          confidence: 0.85,
          measurements: [],
          needsConfirmation: false,
        };
    const entry = mapBackendRecordToEntry(record, structured, fallback, categoryChoice);
    return entry ? [entry] : [];
  });
}

function combineSavedRecordEntries(records: RecordEntry[], detail: string, categoryChoice: RecordCategoryChoice): RecordEntry[] {
  if (categoryChoice !== "all" || records.length <= 1) {
    return records;
  }

  const firstRecord = records[0];
  if (!firstRecord) {
    return [];
  }

  const categories = uniqueValues(records.map((record) => record.category)).filter(isRecordCategory);
  const title = uniqueValues(records.map((record) => record.title)).join(" · ");
  const measurements = records.flatMap((record) => record.structured?.measurements ?? []);
  const groupedMeasurements = groupMeasurementsByLabel(measurements);

  return [
    {
      ...firstRecord,
      categoryChoice: "all",
      title: title || firstRecord.title,
      detail,
      status: strongestRecordStatus(records),
      structured: {
        sourceText: detail,
        normalizedSummary: title || firstRecord.title,
        suggestedCategory: firstRecord.category,
        detectedCategories: categories,
        confidence: firstRecord.structured?.confidence ?? 0.9,
        measurements: groupedMeasurements,
        needsConfirmation: records.some((record) => record.structured?.needsConfirmation === true),
      },
    },
  ];
}

type BackendFetchedRecord = RecordEntry & {
  batchId?: unknown;
  recordedAt?: unknown;
};

function isBackendFetchedRecord(record: unknown): record is BackendFetchedRecord {
  if (!record || typeof record !== "object") {
    return false;
  }

  const candidate = record as Partial<BackendFetchedRecord>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.date === "string" &&
    typeof candidate.time === "string" &&
    isRecordCategory(candidate.category) &&
    typeof candidate.title === "string" &&
    typeof candidate.detail === "string" &&
    isRecordStatus(candidate.status)
  );
}

function combineFetchedRecords(records: BackendFetchedRecord[]): RecordEntry[] {
  const groups = records.reduce<Map<string, BackendFetchedRecord[]>>((grouped, record) => {
    const key = typeof record.batchId === "string" && record.batchId.trim() ? record.batchId : record.id;
    return new Map(grouped).set(key, [...(grouped.get(key) ?? []), record]);
  }, new Map());
  const consumed = new Set<string>();

  return records.reduce<RecordEntry[]>((combined, record) => {
    const key = typeof record.batchId === "string" && record.batchId.trim() ? record.batchId : record.id;
    if (consumed.has(key)) {
      return combined;
    }

    consumed.add(key);
    const group = groups.get(key) ?? [record];
    const categories = uniqueValues(group.map((item) => item.category)).filter(isRecordCategory);
    if (group.length <= 1 || categories.length <= 1) {
      return [...combined, record];
    }

    const title = uniqueValues(group.map((item) => item.title)).join(" · ");
    const detail = uniqueValues(group.map((item) => item.detail)).join("\n");
    return [
      ...combined,
      {
        ...record,
        categoryChoice: "all",
        title: title || record.title,
        detail: detail || record.detail,
        status: strongestRecordStatus(group),
        structured: {
          sourceText: detail || record.detail,
          normalizedSummary: title || record.title,
          suggestedCategory: record.category,
          detectedCategories: categories,
          confidence: 0.9,
          measurements: [],
          needsConfirmation: false,
        },
      },
    ];
  }, []);
}

function combineFetchedRecordResponse(data: unknown) {
  if (!data || typeof data !== "object" || !Array.isArray((data as { records?: unknown }).records)) {
    return data;
  }

  const records = (data as { records: unknown[] }).records;
  if (!records.every(isBackendFetchedRecord)) {
    return data;
  }

  return {
    ...data,
    records: combineFetchedRecords(records),
  };
}

function mapBackendCandidateToStructured(
  candidate: BackendPetLogCandidate,
  detail: string,
  fallbackCategory: RecordCategoryChoice,
  resultNeedsConfirmation: unknown,
  detectedCategories: RecordCategory[] = [],
  measurements?: ExtractedMeasurement[],
): StructuredRecord {
  const category = isRecordCategory(candidate.category) ? candidate.category : fallbackCategory === "all" ? "meal" : fallbackCategory;
  const resolvedMeasurements =
    measurements ??
    groupMeasurementsByLabel(
      mapBackendMeasurements(candidate.measurements).map((measurement) => withMeasurementCategoryLabel(measurement, category)),
    );
  const confidence =
    typeof candidate.confidence === "number" ? Math.min(0.99, Math.max(0.1, candidate.confidence)) : 0.45;
  const candidateTitle = typeof candidate.title === "string" && candidate.title.trim() ? candidate.title.trim() : "";
  const candidateDetail = typeof candidate.detail === "string" && candidate.detail.trim() ? candidate.detail.trim() : detail;

  return {
    sourceText: candidateDetail,
    normalizedSummary: candidateTitle || candidateDetail.slice(0, 80),
    suggestedCategory: category,
    detectedCategories: detectedCategories.length > 1 ? detectedCategories : undefined,
    confidence,
    measurements: resolvedMeasurements,
    needsConfirmation:
      typeof candidate.needs_confirmation === "boolean"
        ? candidate.needs_confirmation
        : typeof resultNeedsConfirmation === "boolean"
          ? resultNeedsConfirmation
          : confidence < 0.7 || (fallbackCategory !== "all" && category !== fallbackCategory),
  };
}

function mapBackendRecordToEntry(
  record: BackendPetLogRecord,
  structured: StructuredRecord,
  fallbackCategory: RecordCategory,
  categoryChoice?: RecordCategoryChoice,
): RecordEntry | null {
  if (
    typeof record.id !== "string" ||
    typeof record.title !== "string" ||
    typeof record.detail !== "string" ||
    typeof record.recorded_at !== "string"
  ) {
    return null;
  }

  const date = formatBackendDateLabel(record.recorded_at);
  const time = formatBackendTimeLabel(record.recorded_at);
  if (!date || !time) {
    return null;
  }

  return {
    id: record.id,
    date,
    time,
    batchId: typeof record.batch_id === "string" && record.batch_id.trim() ? record.batch_id : undefined,
    category: isRecordCategory(record.category) ? record.category : fallbackCategory,
    categoryChoice,
    title: record.title,
    detail: record.detail,
    status: isRecordStatus(record.status) ? record.status : "normal",
    structured,
  };
}

async function requestBackendPetLogRecord(detail: string, fallbackCategory: RecordCategoryChoice, confirm: boolean, timeoutMs?: number) {
  const response = await axios.post<{ success?: boolean; data?: BackendPetLogResult; detail?: unknown }>(
    backendApiUrl("/api/v1/pet-log/records"),
    {
      pet_id: backendPetId(),
      text: detail,
      source: confirm ? "manual" : "ai_preview",
      confirm,
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: timeoutMs ?? backendTimeoutMs(),
      validateStatus: () => true,
    },
  );

  const payload = response.data;
  if (response.status < 200 || response.status >= 300 || payload?.success !== true || !payload.data) {
    const message = typeof payload?.detail === "string" ? payload.detail : "기록 서버 요청을 처리하지 못했습니다.";
    throw new BackendRouteError("BACKEND_RECORD_FAILED", message, response.status || 502);
  }

  const candidate = firstBackendCandidate(payload.data);
  if (!candidate) {
    throw new BackendRouteError("BACKEND_RECORD_FAILED", "기록 서버 응답에 구조화 후보가 없습니다.");
  }

  const structured = mapBackendCandidateToStructured(
    candidate,
    detail,
    fallbackCategory,
    payload.data.needs_confirmation,
    backendCandidateCategories(payload.data),
    backendCandidateMeasurements(payload.data),
  );
  return { result: payload.data, structured };
}

async function proxySpeechTranscription(request: NextRequest) {
  const incomingFormData = await request.formData();
  const audio = incomingFormData.get("audio");
  if (!(audio instanceof File)) {
    return fail("VALIDATION_ERROR", "음성 파일이 필요합니다.", 400);
  }

  const backendFormData = new FormData();
  backendFormData.set("audio", audio);

  const response = await axios.post<{ success?: boolean; data?: { text?: unknown; corrected_text?: unknown }; detail?: unknown }>(
    backendApiUrl("/api/v1/speech/transcriptions"),
    backendFormData,
    { timeout: backendTimeoutMs(), validateStatus: () => true },
  );
  const payload = response.data;

  if (response.status < 200 || response.status >= 300 || payload?.success !== true || typeof payload.data?.text !== "string") {
    const message = typeof payload?.detail === "string" ? payload.detail : "음성 인식을 처리하지 못했습니다.";
    return fail("SPEECH_TRANSCRIPTION_FAILED", message, response.status || 502);
  }

  const correctedText = typeof payload.data.corrected_text === "string" ? payload.data.corrected_text : payload.data.text;
  return ok({ text: payload.data.text, correctedText });
}

async function proxySpeechTextCorrection(body: unknown) {
  const text = body && typeof body === "object" && "text" in body ? (body as { text?: unknown }).text : null;
  if (typeof text !== "string") {
    return fail("VALIDATION_ERROR", "교정할 텍스트가 필요합니다.", 400);
  }

  let response;
  try {
    response = await axios.post<{ success?: boolean; data?: { text?: unknown; corrected_text?: unknown }; detail?: unknown }>(
      backendApiUrl("/api/v1/speech/text-corrections"),
      { text },
      { headers: { "Content-Type": "application/json" }, timeout: backendAiTimeoutMs(), validateStatus: () => true },
    );
  } catch {
    return ok({ text, correctedText: text });
  }

  const payload = response.data;
  if (response.status < 200 || response.status >= 300 || payload?.success !== true || typeof payload.data?.text !== "string") {
    return ok({ text, correctedText: text });
  }

  const correctedText = typeof payload.data.corrected_text === "string" ? payload.data.corrected_text : payload.data.text;
  return ok({ text: payload.data.text, correctedText });
}

async function proxySpeechSynthesis(body: unknown) {
  const text = body && typeof body === "object" && "text" in body ? (body as { text?: unknown }).text : null;
  const voice = body && typeof body === "object" && "voice" in body ? (body as { voice?: unknown }).voice : undefined;
  if (typeof text !== "string") {
    return fail("VALIDATION_ERROR", "합성할 텍스트가 필요합니다.", 400);
  }
  if (voice !== undefined && typeof voice !== "string") {
    return fail("VALIDATION_ERROR", "음성 이름 형식이 올바르지 않습니다.", 400);
  }

  const response = await axios.post(backendApiUrl("/api/v1/speech/synthesis"), { text, voice }, {
    headers: { "Content-Type": "application/json" },
    responseType: "arraybuffer",
    timeout: backendTimeoutMs(),
    validateStatus: () => true,
  });

  if (response.status < 200 || response.status >= 300) {
    const payload = response.data && typeof response.data === "object" && !ArrayBuffer.isView(response.data)
      ? (response.data as { detail?: unknown })
      : null;
    const message = typeof payload?.detail === "string" ? payload.detail : "음성 합성을 처리하지 못했습니다.";
    return fail("SPEECH_SYNTHESIS_FAILED", message, response.status || 502);
  }

  const headers = new Headers();
  headers.set("content-type", String(response.headers["content-type"] ?? "audio/mpeg"));
  headers.set("cache-control", "no-store");
  return new NextResponse(response.data, { headers, status: response.status });
}

async function proxyFileUpload(request: NextRequest) {
  const incomingFormData = await request.formData();
  const file = incomingFormData.get("file");
  if (!(file instanceof File)) {
    return fail("VALIDATION_ERROR", "이미지 파일이 필요합니다.", 400);
  }

  const backendFormData = new FormData();
  backendFormData.set("file", file);
  backendFormData.set("pet_id", backendPetId());
  backendFormData.set("purpose", "profile_photo");

  const response = await axios.post<{ success?: boolean; data?: unknown; detail?: unknown }>(
    backendApiUrl("/api/v1/files"),
    backendFormData,
    { timeout: backendTimeoutMs(), validateStatus: () => true },
  );
  const payload = response.data;

  if (response.status < 200 || response.status >= 300 || payload?.success !== true || !payload.data) {
    const message = typeof payload?.detail === "string" ? payload.detail : "이미지를 저장하지 못했습니다.";
    return fail("FILE_UPLOAD_FAILED", message, response.status || 502);
  }

  return ok(payload.data, response.status);
}

async function proxyFileDownload(fileId: string) {
  const response = await axios.get(backendApiUrl(`/api/v1/files/${encodeURIComponent(fileId)}`), {
    responseType: "arraybuffer",
    timeout: backendTimeoutMs(),
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300) {
    return fail("FILE_NOT_FOUND", "이미지를 찾지 못했습니다.", response.status || 404);
  }

  const headers = new Headers();
  const contentType = response.headers["content-type"];
  if (contentType) {
    headers.set("content-type", String(contentType));
  }
  headers.set("cache-control", "public, max-age=31536000, immutable");
  return new NextResponse(response.data, { status: response.status, headers });
}

async function proxyCommunityGet(request: NextRequest, path: string[]) {
  const communityPath = path.slice(1).map(encodeURIComponent).join("/");
  const query = request.nextUrl.searchParams.toString();
  const response = await axios.get<{ success?: boolean; data?: unknown; detail?: unknown }>(
    backendApiUrl(`/api/v1/community/${communityPath}${query ? `?${query}` : ""}`),
    { timeout: backendTimeoutMs(), validateStatus: () => true },
  );

  if (response.status < 200 || response.status >= 300 || response.data?.success !== true) {
    const message = typeof response.data?.detail === "string" ? response.data.detail : "커뮤니티 데이터를 불러오지 못했습니다.";
    return fail("BACKEND_COMMUNITY_FAILED", message, response.status || 502);
  }

  return ok(response.data.data, response.status);
}

async function proxyCommunityPost(path: string[], body: unknown) {
  const communityPath = path.slice(1).map(encodeURIComponent).join("/");
  const response = await axios.post<{ success?: boolean; data?: unknown; detail?: unknown }>(
    backendApiUrl(`/api/v1/community/${communityPath}`),
    body ?? {},
    { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
  );

  if (response.status < 200 || response.status >= 300 || response.data?.success !== true) {
    const message = typeof response.data?.detail === "string" ? response.data.detail : "커뮤니티 요청을 처리하지 못했습니다.";
    return fail("BACKEND_COMMUNITY_FAILED", message, response.status || 502);
  }

  return ok(response.data.data, response.status);
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const path = await getPath(context);

  if (path[0] === "community" && path.length >= 2) {
    return proxyCommunityGet(_request, path);
  }

  if (path[0] === "files" && path[1] && path.length === 2) {
    return proxyFileDownload(path[1]);
  }

  if (path[0] === "me" && path.length === 1) {
    try {
      const response = await axios.get(backendApiUrl("/api/v1/me"), { timeout: backendTimeoutMs(), validateStatus: () => true });
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true || !response.data.data) {
        return ok(mockCurrentUser());
      }
      return ok(response.data.data);
    } catch {
      return ok(mockCurrentUser());
    }
  }

  if (path[0] === "pets" && path.length === 1) {
    try {
      const response = await axios.get(backendApiUrl("/api/v1/pets"), { timeout: backendTimeoutMs(), validateStatus: () => true });
      const data = response.data?.data;
      if (data && Array.isArray(data.pets)) {
        return ok(data);
      }
      return ok(mockPets());
    } catch {
      return ok(mockPets());
    }
  }

  if (path[0] === "notifications" && path.length === 1) {
    const petId = _request.nextUrl.searchParams.get("pet_id") || backendPetId();
    try {
      const response = await axios.get(backendApiUrl(`/api/v1/notifications?pet_id=${encodeURIComponent(petId)}`), {
        timeout: backendTimeoutMs(),
        validateStatus: () => true,
      });
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_NOTIFICATION_FAILED", "알림 목록을 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "pet-log" && path[1] === "records" && path.length === 2) {
    const petId = _request.nextUrl.searchParams.get("pet_id") || backendPetId();
    try {
      const response = await axios.get(backendApiUrl(`/api/v1/pet-log/records?pet_id=${encodeURIComponent(petId)}`), {
        timeout: backendTimeoutMs(),
        validateStatus: () => true,
      });
      return ok(combineFetchedRecordResponse(response.data.data));
    } catch {
      return fail("BACKEND_RECORDS_FAILED", "기록 목록을 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "pet-log" && path[1] === "schedules" && path.length === 2) {
    const petId = _request.nextUrl.searchParams.get("pet_id") || backendPetId();
    try {
      const response = await axios.get(backendApiUrl(`/api/v1/pet-log/schedules?pet_id=${encodeURIComponent(petId)}`), {
        timeout: backendTimeoutMs(),
        validateStatus: () => true,
      });
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_SCHEDULES_FAILED", "일정 목록을 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "ai" && path[1] === "insights" && path.length === 2) {
    const petId = _request.nextUrl.searchParams.get("pet_id") || backendPetId();
    try {
      const response = await axios.get(backendApiUrl(`/api/v1/ai/insights?pet_id=${encodeURIComponent(petId)}`), {
        timeout: backendAiTimeoutMs(),
        validateStatus: () => true,
      });
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_INSIGHTS_FAILED", "AI 분석 결과를 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "ai" && path[1] === "suggestions" && path.length === 2) {
    const petId = _request.nextUrl.searchParams.get("pet_id") || backendPetId();
    try {
      const response = await axios.get(backendApiUrl(`/api/v1/ai/suggestions?pet_id=${encodeURIComponent(petId)}`), {
        timeout: backendAiTimeoutMs(),
        validateStatus: () => true,
      });
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_SUGGESTIONS_FAILED", "AI 케어 제안을 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "shopping" && path[1] === "recommendations" && path.length === 2) {
    const petId = _request.nextUrl.searchParams.get("pet_id") || backendPetId();
    try {
      const response = await axios.get(backendApiUrl(`/api/v1/shopping/recommendations?pet_id=${encodeURIComponent(petId)}`), {
        timeout: backendShoppingTimeoutMs(),
        validateStatus: () => true,
      });
      const recommendations = response.data?.data?.recommendations;
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true || !Array.isArray(recommendations)) {
        return fail("BACKEND_SHOPPING_FAILED", "쇼핑 추천 응답 형식이 올바르지 않습니다.", 502);
      }
      return ok({ recommendations });
    } catch {
      return fail("BACKEND_SHOPPING_FAILED", "쇼핑 추천을 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "chatbot" && path[1] === "threads" && path.length === 2) {
    return ok({ threads: getMockChatbotThreads() });
  }

  return fail("NOT_FOUND", "요청한 API를 찾을 수 없습니다.", 404);
}

export async function POST(request: NextRequest, context: RouteContext) {
  const path = await getPath(context);
  if (isSpeechTranscriptionPath(path)) {
    return proxySpeechTranscription(request);
  }
  if (path[0] === "files" && path.length === 1) {
    return proxyFileUpload(request);
  }

  const body = await readJson(request);

  if (isSpeechSynthesisPath(path)) {
    return proxySpeechSynthesis(body);
  }
  if (isSpeechTextCorrectionPath(path)) {
    return proxySpeechTextCorrection(body);
  }

  if (path[0] === "community" && path.length >= 2) {
    return proxyCommunityPost(path, body);
  }

  if (path[0] === "records" && path.length === 1) {
    if (!body || typeof body.detail !== "string" || !isRecordCategoryChoice(body.category)) {
      return fail("VALIDATION_ERROR", "기록 카테고리와 내용을 입력해주세요.");
    }
    try {
      const { result } = await requestBackendPetLogRecord(body.detail, body.category, true);
      const records = combineSavedRecordEntries(
        mapBackendSavedRecordsToEntries(result, body.detail, body.category),
        body.detail,
        body.category,
      );
      if (records.length > 0) {
        return ok({ records }, 201);
      }
      return fail("BACKEND_RECORD_FAILED", "기록 서버 응답에 저장된 기록이 없습니다.", 502);
    } catch {
      return fail("BACKEND_RECORD_FAILED", "기록 서버 요청을 처리하지 못했습니다.", 502);
    }
  }

  if (path[0] === "ai" && path[1] === "records" && path[2] === "structure" && path.length === 3) {
    if (!body || typeof body.detail !== "string" || !isRecordCategoryChoice(body.fallbackCategory)) {
      return fail("VALIDATION_ERROR", "구조화할 기록 내용과 기본 카테고리를 입력해주세요.");
    }
    try {
      const { structured } = await requestBackendPetLogRecord(body.detail, body.fallbackCategory, false, backendAiTimeoutMs());
      return ok({ structured });
    } catch (error) {
      console.warn("[api/ai/records/structure] backend fallback:", error instanceof Error ? error.message : error);
      return ok({ structured: structureRecord(body.detail, body.fallbackCategory) });
    }
  }

  if (path[0] === "schedules" && path.length === 1) {
    if (!body || typeof body.title !== "string" || typeof body.dueDate !== "string" || typeof body.category !== "string") {
      return fail("VALIDATION_ERROR", "일정 분류, 제목, 예정일을 입력해주세요.");
    }
    try {
      const response = await axios.post<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl("/api/v1/pet-log/schedules"),
        {
          pet_id: backendPetId(),
          category: body.category,
          title: body.title,
          dueDate: body.dueDate,
          repeatLabel: typeof body.repeatLabel === "string" ? body.repeatLabel : "한 번",
          note: typeof body.note === "string" ? body.note : "",
        },
        { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true || !response.data.data) {
        return fail("BACKEND_SCHEDULE_FAILED", "일정 생성을 처리하지 못했습니다.", 502);
      }
      return ok({ schedule: response.data.data }, 201);
    } catch {
      return fail("BACKEND_SCHEDULE_FAILED", "일정 생성을 처리하지 못했습니다.", 502);
    }
  }

  if (path[0] === "ai" && path[1] === "care-answer" && path.length === 2) {
    if (!body || typeof body.question !== "string" || !body.question.trim()) {
      return fail("VALIDATION_ERROR", "질문을 입력해주세요.");
    }

    const petId = typeof body.pet_id === "string" && body.pet_id.trim() ? body.pet_id : backendPetId();
    try {
      const response = await axios.post<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl("/api/v1/ai/care-answer"),
        {
          pet_id: petId,
          question: body.question,
        },
        { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true || !response.data.data) {
        const message = typeof response.data?.detail === "string" ? response.data.detail : "AI 답변을 불러오지 못했습니다.";
        return fail("BACKEND_CARE_ANSWER_FAILED", message, response.status || 502);
      }
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_CARE_ANSWER_FAILED", "AI 답변을 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "ai" && path[1] === "pet-chat" && path.length === 2) {
    if (!body || typeof body.message !== "string" || !body.message.trim()) {
      return fail("VALIDATION_ERROR", "메시지를 입력해주세요.");
    }

    const petId = typeof body.pet_id === "string" && body.pet_id.trim() ? body.pet_id : backendPetId();
    try {
      const response = await axios.post<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl("/api/v1/ai/pet-chat"),
        {
          pet_id: petId,
          message: body.message,
        },
        { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true || !response.data.data) {
        const message = typeof response.data?.detail === "string" ? response.data.detail : "대화 답변을 불러오지 못했습니다.";
        return fail("BACKEND_PET_CHAT_FAILED", message, response.status || 502);
      }
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_PET_CHAT_FAILED", "대화 답변을 불러오지 못했습니다.", 502);
    }
  }

  if (path[0] === "chatbot" && path[1] === "threads" && path.length === 2) {
    const title = body && typeof body.title === "string" && body.title.trim() ? body.title : "새 질문";
    return ok({ thread: createMockChatbotThread(title) }, 201);
  }

  if (path[0] === "chatbot" && path[1] === "threads" && path[2] && path[3] === "messages" && path.length === 4) {
    if (!body || typeof body.question !== "string" || !body.question.trim()) {
      return fail("VALIDATION_ERROR", "질문을 입력해주세요.");
    }
    const message = await createPetLogChatbotMessage({
      question: body.question,
      contextRecordIds: Array.isArray(body.contextRecordIds) ? body.contextRecordIds : [],
      state: getMockPetLogState(),
    });
    const exchange = appendMockChatbotExchange(path[2], body.question, message);
    if (!exchange) {
      return fail("NOT_FOUND", "대화방을 찾을 수 없습니다.", 404);
    }
    return ok({
      ...exchange,
      answer: message.answer,
      referencedRecordIds: message.referencedRecordIds,
      safetyNotice: message.safetyNotice,
    });
  }

  if (path[0] === "chatbot" && path[1] === "messages" && path.length === 2) {
    if (!body || typeof body.question !== "string" || !body.question.trim()) {
      return fail("VALIDATION_ERROR", "질문을 입력해주세요.");
    }
    const message = await createPetLogChatbotMessage({
      question: body.question,
      contextRecordIds: Array.isArray(body.contextRecordIds) ? body.contextRecordIds : [],
      state: getMockPetLogState(),
    });
    const exchange = appendMockChatbotExchange(typeof body.threadId === "string" ? body.threadId : undefined, body.question, message);
    if (!exchange) {
      return fail("NOT_FOUND", "대화방을 찾을 수 없습니다.", 404);
    }
    return ok({
      ...message,
      threadId: exchange.thread.id,
      thread: exchange.thread,
      userMessage: exchange.userMessage,
      assistantMessage: exchange.assistantMessage,
    });
  }

  if (path[0] === "pets" && path.length === 1) {
    const petBody = body && typeof body === "object" ? { ...body, name: resolveProfileName(body.name) } : { name: profileNameFallback() };
    try {
      const response = await axios.post(backendApiUrl("/api/v1/pets"), petBody, { timeout: backendTimeoutMs(), validateStatus: () => true });
      return ok(response.data.data, 201);
    } catch {
      return fail("BACKEND_PET_CREATE_FAILED", "반려동물을 추가하지 못했습니다.", 502);
    }
  }

  if (path[0] === "hospitals" && path[1] === "recommendations" && path.length === 2) {
    if (!body || typeof body.latitude !== "number" || typeof body.longitude !== "number") {
      return fail("VALIDATION_ERROR", "위도와 경도 정보가 필요합니다.");
    }
    try {
      const response = await axios.post<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl("/api/v1/hospitals/recommendations"),
        body,
        { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true || !response.data.data) {
        const message = typeof response.data?.detail === "string" ? response.data.detail : "병원 추천을 불러오지 못했습니다.";
        return fail("BACKEND_HOSPITAL_FAILED", message, response.status || 502);
      }
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_HOSPITAL_FAILED", "병원 추천을 불러오지 못했습니다.", 502);
    }
  }

  return fail("NOT_FOUND", "요청한 API를 찾을 수 없습니다.", 404);
}

export async function PUT(request: NextRequest, context: RouteContext) {
  const path = await getPath(context);
  const body = await readJson(request);

  if (path[0] === "profile" && path.length === 1) {
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "프로필 형식이 올바르지 않습니다.");
    }
    const profileBody = {
      ...body,
      name: resolveProfileName(body.name),
      breed: resolveProfileBreed(body.breed),
    };
    try {
      const response = await axios.put<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl("/api/v1/pet-log/profile"),
        {
          pet_id: backendPetId(),
          ...profileBody,
        },
        { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true || !response.data.data) {
        return fail("BACKEND_PROFILE_FAILED", "프로필 수정을 처리하지 못했습니다.", 502);
      }
      return ok({ profile: response.data.data });
    } catch {
      return fail("BACKEND_PROFILE_FAILED", "프로필 수정을 처리하지 못했습니다.", 502);
    }
  }

  if (path[0] === "settings" && path.length === 1) {
    if (!body || typeof body.aiInsightEnabled !== "boolean" || !body.notificationPreferences) {
      return fail("VALIDATION_ERROR", "설정 형식이 올바르지 않습니다.");
    }
    return ok({ settings: updateMockSettings(body) });
  }

  if (path[0] === "notifications" && path[1] === "read" && path.length === 2) {
    if (!body || !Array.isArray(body.readNotificationIds)) {
      return fail("VALIDATION_ERROR", "읽음 처리할 알림 ID가 필요합니다.");
    }
    try {
      // 현재 백엔드는 pet_id 기준 일괄 읽음만 지원하므로 루프 돌리거나 일괄 API 호출
      const response = await axios.put<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl(`/api/v1/notifications/read?pet_id=${encodeURIComponent(backendPetId())}`),
        {},
        { timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true) {
        return fail("BACKEND_NOTIFICATION_FAILED", "알림 읽음 처리를 실패했습니다.", 502);
      }
      return ok({ readNotificationIds: body.readNotificationIds });
    } catch {
      return fail("BACKEND_NOTIFICATION_FAILED", "알림 읽음 처리를 실패했습니다.", 502);
    }
  }

  if (path[0] === "expansion-state" && path.length === 1) {
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "확장 상태 형식이 올바르지 않습니다.");
    }
    return ok({ expansionState: updateMockExpansionState(body) });
  }

  return fail("NOT_FOUND", "요청한 API를 찾을 수 없습니다.", 404);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const path = await getPath(context);
  const body = await readJson(request);

  if (path[0] === "records" && path[1] && path.length === 2) {
    if (!body || typeof body.detail !== "string" || !isRecordCategoryChoice(body.category)) {
      return fail("VALIDATION_ERROR", "기록 카테고리와 내용을 입력해주세요.");
    }
    try {
      const { result, structured } = await requestBackendPetLogRecord(body.detail, body.category, false);
      const candidate = firstBackendCandidate(result);
      const category: RecordCategory = isRecordCategory(candidate?.category)
        ? (candidate!.category as RecordCategory)
        : body.category === "all" ? "meal" : (body.category as RecordCategory);
      const title = typeof candidate?.title === "string" && candidate.title.trim()
        ? candidate.title.trim()
        : (body.detail as string).slice(0, 80);
      const status: RecordStatus = isRecordStatus(candidate?.status) ? (candidate!.status as RecordStatus) : "normal";

      const patchResp = await axios.patch<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl(`/api/v1/pet-log/records/${encodeURIComponent(path[1])}`),
        { detail: body.detail, category, title, status },
        { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (patchResp.status === 404) {
        return fail("NOT_FOUND", "수정할 기록을 찾을 수 없습니다.", 404);
      }
      if (patchResp.status < 200 || patchResp.status >= 300 || patchResp.data?.success !== true) {
        return fail("BACKEND_RECORD_FAILED", "기록 수정을 처리하지 못했습니다.", 502);
      }
      const updated = patchResp.data.data as BackendRecordEntry | null;
      if (!updated || typeof updated.id !== "string") {
        return fail("BACKEND_RECORD_FAILED", "기록 수정 응답 형식이 올바르지 않습니다.", 502);
      }
      const record: RecordEntry = {
        id: updated.id,
        date: typeof updated.date === "string" ? updated.date : "",
        time: typeof updated.time === "string" ? updated.time : "",
        category,
        categoryChoice: body.category,
        title,
        detail: body.detail,
        status,
        structured,
      };
      return ok({ record });
    } catch {
      return fail("BACKEND_RECORD_FAILED", "기록 수정을 처리하지 못했습니다.", 502);
    }
  }

  if (path[0] === "schedules" && path[1] && path.length === 2) {
    if (!body || typeof body !== "object") {
      return fail("VALIDATION_ERROR", "일정 수정 내용이 필요합니다.");
    }
    try {
      const patchResp = await axios.patch<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl(`/api/v1/pet-log/schedules/${encodeURIComponent(path[1])}`),
        body,
        { headers: { "Content-Type": "application/json" }, timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (patchResp.status === 404) {
        return fail("NOT_FOUND", "수정할 일정을 찾을 수 없습니다.", 404);
      }
      if (patchResp.status < 200 || patchResp.status >= 300 || patchResp.data?.success !== true || !patchResp.data.data) {
        return fail("BACKEND_SCHEDULE_FAILED", "일정 수정을 처리하지 못했습니다.", 502);
      }
      return ok({ schedule: patchResp.data.data });
    } catch {
      return fail("BACKEND_SCHEDULE_FAILED", "일정 수정을 처리하지 못했습니다.", 502);
    }
  }

  if (path[0] === "pets" && path[1] && path.length === 2) {
    try {
      const response = await axios.patch(backendApiUrl(`/api/v1/pets/${encodeURIComponent(path[1])}`), body, { timeout: backendTimeoutMs(), validateStatus: () => true });
      if (response.status === 404) return fail("NOT_FOUND", "반려동물을 찾을 수 없습니다.", 404);
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_PET_UPDATE_FAILED", "반려동물 정보를 수정하지 못했습니다.", 502);
    }
  }

  if (path[0] === "notifications" && path[1] && path[2] === "read" && path.length === 3) {
    try {
      const response = await axios.patch(backendApiUrl(`/api/v1/notifications/${encodeURIComponent(path[1])}/read`), {}, { timeout: backendTimeoutMs(), validateStatus: () => true });
      if (response.status === 404) return fail("NOT_FOUND", "알림을 찾을 수 없습니다.", 404);
      return ok(response.data.data);
    } catch {
      return fail("BACKEND_NOTIFICATION_FAILED", "알림 읽음 처리를 실패했습니다.", 502);
    }
  }

  return fail("NOT_FOUND", "요청한 API를 찾을 수 없습니다.", 404);
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const path = await getPath(context);

  if (path[0] === "records" && path[1] && path.length === 2) {
    try {
      const response = await axios.delete<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl(`/api/v1/pet-log/records/${encodeURIComponent(path[1])}`),
        { timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status === 404) {
        return fail("NOT_FOUND", "삭제할 기록을 찾을 수 없습니다.", 404);
      }
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true) {
        return fail("BACKEND_RECORD_FAILED", "기록 삭제를 처리하지 못했습니다.", 502);
      }
      return ok({ deletedId: path[1] });
    } catch {
      return fail("BACKEND_RECORD_FAILED", "기록 삭제를 처리하지 못했습니다.", 502);
    }
  }

  if (path[0] === "schedules" && path[1] && path.length === 2) {
    try {
      const response = await axios.delete<{ success?: boolean; data?: unknown; detail?: unknown }>(
        backendApiUrl(`/api/v1/pet-log/schedules/${encodeURIComponent(path[1])}`),
        { timeout: backendTimeoutMs(), validateStatus: () => true },
      );
      if (response.status === 404) {
        return fail("NOT_FOUND", "삭제할 일정을 찾을 수 없습니다.", 404);
      }
      if (response.status < 200 || response.status >= 300 || response.data?.success !== true) {
        return fail("BACKEND_SCHEDULE_FAILED", "일정 삭제를 처리하지 못했습니다.", 502);
      }
      return ok({ deletedId: path[1] });
    } catch {
      return fail("BACKEND_SCHEDULE_FAILED", "일정 삭제를 처리하지 못했습니다.", 502);
    }
  }

  if (path[0] === "pets" && path[1] && path.length === 2) {
    try {
      const response = await axios.delete(backendApiUrl(`/api/v1/pets/${encodeURIComponent(path[1])}`), { timeout: backendTimeoutMs(), validateStatus: () => true });
      if (response.status === 404) return fail("NOT_FOUND", "삭제할 반려동물을 찾을 수 없습니다.", 404);
      return ok({ deletedId: path[1] });
    } catch {
      return fail("BACKEND_PET_DELETE_FAILED", "반려동물을 삭제하지 못했습니다.", 502);
    }
  }

  return fail("NOT_FOUND", "요청한 API를 찾을 수 없습니다.", 404);
}

import axios, { AxiosError } from "axios";
import type { ExpansionState } from "./expansion-state";
import type {
  AiInsight,
  AiSuggestion,
  AppSettings,
  CareNotification,
  CareSchedule,
  ChatbotMessage,
  ChatbotThread,
  PetProfile,
  RecordCategoryChoice,
  RecordEntry,
  ScheduleCategory,
  StructuredRecord,
} from "./types";
import type { ShoppingRecommendation } from "./expansion-features";

export type ApiSuccess<T> = {
  ok: true;
  data: T;
};

export type ApiFailure = {
  ok: false;
  error: {
    code: string;
    message: string;
  };
};

export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export type User = {
  id: string;
  email: string;
  name: string;
};

export type Pet = PetProfile & { id: string };

export type NewRecordInput = {
  category: RecordCategoryChoice;
  detail: string;
};

export type UpdateRecordInput = {
  category: RecordCategoryChoice;
  detail: string;
};

export type StructureRecordInput = {
  detail: string;
  fallbackCategory: RecordCategoryChoice;
};

export type NewScheduleInput = {
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
};

export type UpdateScheduleInput = Partial<{
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
  isDone: boolean;
}>;

export type ChatbotMessageResponse = {
  answer: string;
  referencedRecordIds: string[];
  safetyNotice: string;
  threadId?: string;
  thread?: ChatbotThread;
  userMessage?: ChatbotMessage;
  assistantMessage?: ChatbotMessage;
};

export type ChatbotThreadMessageResponse = {
  thread: ChatbotThread;
  userMessage: ChatbotMessage;
  assistantMessage: ChatbotMessage;
  answer: string;
  referencedRecordIds: string[];
  safetyNotice: string;
};

export type CareAnswerResponse = {
  answer: string;
  referencedRecordIds: string[];
  safetyNotice: string;
};

export type PetChatResponse = {
  answer: string;
  routedToCareQuestion: boolean;
  safetyNotice: string;
};

export type SpeechTranscriptionResponse = {
  text: string;
  correctedText: string;
};

export type UploadedFile = {
  id: string;
  url: string;
  pet_id: string | null;
  purpose: string;
  mime_type: string;
  byte_size: number;
};

export class PetLogApiError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PetLogApiError";
    this.code = code;
  }
}

export const apiClient = axios.create({
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

async function requestData<T>(request: Promise<{ data: ApiResponse<T> }>) {
  try {
    const response = await request;
    if (!response.data.ok) {
      throw new PetLogApiError(response.data.error.code, response.data.error.message);
    }
    return response.data.data;
  } catch (error) {
    if (error instanceof PetLogApiError) {
      throw error;
    }

    if (error instanceof AxiosError) {
      const data = error.response?.data as ApiFailure | undefined;
      if (data && data.ok === false) {
        throw new PetLogApiError(data.error.code, data.error.message);
      }
      throw new PetLogApiError("INTERNAL_ERROR", "API 요청을 처리하지 못했습니다.");
    }

    throw new PetLogApiError("INTERNAL_ERROR", "알 수 없는 API 오류가 발생했습니다.");
  }
}

export function fetchMe() {
  return requestData<User>(apiClient.get("/me"));
}

export function fetchPets() {
  return requestData<{ pets: Pet[] }>(apiClient.get("/pets"));
}

export function fetchRecords(petId: string) {
  return requestData<{ records: RecordEntry[] }>(apiClient.get("/pet-log/records", { params: { pet_id: petId } }));
}

export function fetchSchedules(petId: string) {
  return requestData<{ schedules: CareSchedule[] }>(apiClient.get("/pet-log/schedules", { params: { pet_id: petId } }));
}

export function fetchNotifications(petId: string) {
  return requestData<{ notifications: CareNotification[]; readNotificationIds: string[] }>(apiClient.get("/notifications", { params: { pet_id: petId } }));
}

export function updateProfile(input: PetProfile) {
  return requestData<{ profile: PetProfile }>(apiClient.put("/profile", input));
}

export function createRecord(input: NewRecordInput) {
  return requestData<{ records: RecordEntry[] }>(apiClient.post("/records", input));
}

export function structureRecordPreview(input: StructureRecordInput) {
  return requestData<{ structured: StructuredRecord }>(apiClient.post("/ai/records/structure", input));
}

export function fetchAiInsights(petId: string) {
  return requestData<{ insights: AiInsight[] }>(apiClient.get("/ai/insights", { params: { pet_id: petId } }));
}

export function fetchAiSuggestions(petId: string) {
  return requestData<{ suggestions: AiSuggestion[] }>(apiClient.get("/ai/suggestions", { params: { pet_id: petId } }));
}

export function fetchShoppingRecommendations(petId: string) {
  return requestData<{ recommendations: ShoppingRecommendation[] }>(
    apiClient.get("/shopping/recommendations", { params: { pet_id: petId } }),
  );
}

export function transcribeSpeechAudio(audio: File) {
  const formData = new FormData();
  formData.set("audio", audio);
  return requestData<SpeechTranscriptionResponse>(axios.post("/api/v1/speech/transcriptions", formData)).then(
    withCorrectedSpeechTextFallback,
  );
}

export function correctSpeechText(text: string) {
  return requestData<SpeechTranscriptionResponse>(apiClient.post("/speech/text-corrections", { text })).then(
    withCorrectedSpeechTextFallback,
  );
}

function withCorrectedSpeechTextFallback(response: SpeechTranscriptionResponse): SpeechTranscriptionResponse {
  return {
    ...response,
    correctedText: response.correctedText || response.text,
  };
}

export async function synthesizeSpeech(text: string, voice?: string) {
  console.info("[api-client] POST /api/v1/speech/synthesis", {
    textLength: text.trim().length,
    voice: voice ?? null,
  });
  const response = await axios.post("/api/v1/speech/synthesis", { text, voice }, { responseType: "blob" });
  return response.data as Blob;
}

export function uploadProfilePhoto(photo: File) {
  const formData = new FormData();
  formData.set("file", photo);
  return requestData<{ file: UploadedFile }>(axios.post("/api/v1/files", formData));
}

export function updateRecord(id: string, input: UpdateRecordInput) {
  return requestData<{ record: RecordEntry }>(apiClient.patch(`/records/${id}`, input));
}

export function deleteRecord(id: string) {
  return requestData<{ deletedId: string }>(apiClient.delete(`/records/${id}`));
}

export function createSchedule(input: NewScheduleInput) {
  return requestData<{ schedule: CareSchedule }>(apiClient.post("/schedules", input));
}

export function updateSchedule(id: string, input: UpdateScheduleInput) {
  return requestData<{ schedule: CareSchedule }>(apiClient.patch(`/schedules/${id}`, input));
}

export function deleteSchedule(id: string) {
  return requestData<{ deletedId: string }>(apiClient.delete(`/schedules/${id}`));
}

export function updateSettings(input: AppSettings) {
  return requestData<{ settings: AppSettings }>(apiClient.put("/settings", input));
}

export function updateReadNotifications(petId: string, readNotificationIds: string[]) {
  return requestData<{ readNotificationIds: string[] }>(
    apiClient.put("/notifications/read", { readNotificationIds }, { params: { pet_id: petId } })
  );
}

export function updateExpansionState(input: Partial<ExpansionState>) {
  return requestData<{ expansionState: ExpansionState }>(apiClient.put("/expansion-state", input));
}

export function getChatbotThreads() {
  return requestData<{ threads: ChatbotThread[] }>(apiClient.get("/chatbot/threads"));
}

export function createChatbotThread(title?: string) {
  return requestData<{ thread: ChatbotThread }>(apiClient.post("/chatbot/threads", { title }));
}

export function sendChatbotThreadMessage(threadId: string, question: string, contextRecordIds?: string[]) {
  return requestData<ChatbotThreadMessageResponse>(apiClient.post(`/chatbot/threads/${threadId}/messages`, { question, contextRecordIds }));
}

export function sendChatbotMessage(question: string, contextRecordIds?: string[], threadId?: string) {
  return requestData<ChatbotMessageResponse>(apiClient.post("/chatbot/messages", { question, contextRecordIds, threadId }));
}

export function askCareAnswer(question: string, petId?: string) {
  return requestData<CareAnswerResponse>(apiClient.post("/ai/care-answer", { question, pet_id: petId }));
}

export function askPetChat(message: string, petId?: string) {
  return requestData<PetChatResponse>(apiClient.post("/ai/pet-chat", { message, pet_id: petId }));
}

export type HospitalRecommendationItem = {
  place_id: string;
  name: string;
  address: string;
  phone_number: string;
  google_maps_url: string;
  latitude: number | null;
  longitude: number | null;
  rating: number | null;
  user_rating_count: number;
  is_open_now: boolean | null;
  is_24_hours: boolean;
  weekday_text: string[];
  distance_meters: number | null;
  reason: string;
};

export type HospitalRecommendationsResponse = {
  current_time: string;
  search_center: {
    latitude: number;
    longitude: number;
    radius_meters: number;
    location_source: string;
    accuracy_meters: number | null;
    emergency_mode: boolean;
  };
  recommendations: HospitalRecommendationItem[];
};

export function fetchHospitalRecommendations(
  latitude: number,
  longitude: number,
  options?: { text?: string; emergency?: boolean; radius_meters?: number }
) {
  return requestData<HospitalRecommendationsResponse>(
    apiClient.post("/hospitals/recommendations", { latitude, longitude, ...options })
  );
}

import type { ExpansionState, SharedCareRole } from "./expansion-state";
import type { ChatbotMessageRole, RecordCategory, RecordStatus, ScheduleCategory } from "./types";

export type UUID = string;
export type ISODateString = string;
export type ISODateTimeString = string;
export type DecimalNumber = number;

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };
export type JsonObject = { [key: string]: JsonValue };

export type AiProviderId = "mock" | "openai";
export type RecordInputSource = "manual" | "voice" | "ai_preview";
export type SharedCareMemberStatus = "active" | "removed";
export type SharedCareInvitationStatus = "pending" | "accepted" | "rejected" | "canceled" | "expired";
export type HospitalReportStatus = "draft" | "shared" | "archived";
export type FilePurpose = "profile_photo" | "record_attachment" | "product_image";

export type UserRow = {
  id: UUID;
  email: string;
  display_name: string | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  deleted_at: ISODateTimeString | null;
};

export type PetRow = {
  id: UUID;
  owner_user_id: UUID;
  name: string;
  breed: string;
  age_label: string | null;
  sex_label: string | null;
  weight_label: string | null;
  birthday: ISODateString | null;
  personality: string | null;
  notes: string[];
  photo_file_id: UUID | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  deleted_at: ISODateTimeString | null;
};

export type PetRecordRow = {
  id: UUID;
  pet_id: UUID;
  created_by_user_id: UUID;
  recorded_at: ISODateTimeString;
  category: RecordCategory;
  title: string;
  detail: string;
  status: RecordStatus;
  source: RecordInputSource;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  deleted_at: ISODateTimeString | null;
};

export type StructuredRecordRow = {
  id: UUID;
  record_id: UUID | null;
  pet_id: UUID;
  source_text: string;
  normalized_summary: string;
  suggested_category: RecordCategory;
  confidence: DecimalNumber;
  needs_confirmation: boolean;
  provider: AiProviderId;
  model: string | null;
  raw_response: JsonObject | null;
  created_at: ISODateTimeString;
};

export type StructuredRecordMeasurementRow = {
  id: UUID;
  structured_record_id: UUID;
  label: string;
  value_text: string;
  numeric_value: DecimalNumber | null;
  unit: string | null;
  created_at: ISODateTimeString;
};

export type CareScheduleRow = {
  id: UUID;
  pet_id: UUID;
  created_by_user_id: UUID;
  category: ScheduleCategory;
  title: string;
  due_date: ISODateString;
  repeat_label: string;
  note: string;
  is_done: boolean;
  completed_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  deleted_at: ISODateTimeString | null;
};

export type AppSettingsRow = {
  id: UUID;
  user_id: UUID;
  pet_id: UUID | null;
  missing_record_notification: boolean;
  alert_notification: boolean;
  schedule_notification: boolean;
  ai_insight_enabled: boolean;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type NotificationReadRow = {
  id: UUID;
  user_id: UUID;
  pet_id: UUID;
  notification_id: string;
  read_at: ISODateTimeString;
};

export type ChatbotThreadRow = {
  id: UUID;
  user_id: UUID;
  pet_id: UUID;
  title: string;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
  deleted_at: ISODateTimeString | null;
};

export type ChatbotMessageRow = {
  id: UUID;
  thread_id: UUID;
  role: ChatbotMessageRole;
  content: string;
  safety_notice: string | null;
  referenced_record_ids: UUID[];
  provider: AiProviderId | null;
  model: string | null;
  created_at: ISODateTimeString;
};

export type ExpansionStateRow = {
  id: UUID;
  user_id: UUID;
  pet_id: UUID;
  shared_care_state: ExpansionState["sharedCare"];
  hospital_state: ExpansionState["hospital"];
  shopping_state: ExpansionState["shopping"];
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type SharedCareMemberRow = {
  id: UUID;
  pet_id: UUID;
  user_id: UUID;
  role: SharedCareRole;
  status: SharedCareMemberStatus;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type SharedCareInvitationRow = {
  id: UUID;
  pet_id: UUID;
  invited_by_user_id: UUID;
  target: string;
  role: SharedCareRole;
  status: SharedCareInvitationStatus;
  message: string | null;
  expires_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type HospitalRow = {
  id: UUID;
  name: string;
  address: string;
  phone: string | null;
  latitude: DecimalNumber | null;
  longitude: DecimalNumber | null;
  opening_hours: JsonObject | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type HospitalReportRow = {
  id: UUID;
  pet_id: UUID;
  created_by_user_id: UUID;
  hospital_id: UUID | null;
  symptom_memo: string | null;
  summary: string;
  record_ids: UUID[];
  status: HospitalReportStatus;
  share_token: string | null;
  shared_at: ISODateTimeString | null;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type ProductRow = {
  id: UUID;
  name: string;
  category: string;
  description: string | null;
  image_file_id: UUID | null;
  partner_url: string | null;
  is_active: boolean;
  created_at: ISODateTimeString;
  updated_at: ISODateTimeString;
};

export type ProductRecommendationRow = {
  id: UUID;
  pet_id: UUID;
  product_id: UUID;
  reason: string;
  source_record_ids: UUID[];
  score: DecimalNumber | null;
  created_at: ISODateTimeString;
};

export type SavedProductRow = {
  id: UUID;
  user_id: UUID;
  pet_id: UUID;
  product_id: UUID;
  created_at: ISODateTimeString;
};

export type FileRow = {
  id: UUID;
  owner_user_id: UUID;
  pet_id: UUID | null;
  purpose: FilePurpose;
  storage_key: string;
  mime_type: string;
  byte_size: number;
  created_at: ISODateTimeString;
  deleted_at: ISODateTimeString | null;
};

export type PetLogDatabase = {
  users: UserRow;
  pets: PetRow;
  pet_records: PetRecordRow;
  structured_records: StructuredRecordRow;
  structured_record_measurements: StructuredRecordMeasurementRow;
  care_schedules: CareScheduleRow;
  app_settings: AppSettingsRow;
  notification_reads: NotificationReadRow;
  chatbot_threads: ChatbotThreadRow;
  chatbot_messages: ChatbotMessageRow;
  expansion_states: ExpansionStateRow;
  shared_care_members: SharedCareMemberRow;
  shared_care_invitations: SharedCareInvitationRow;
  hospitals: HospitalRow;
  hospital_reports: HospitalReportRow;
  products: ProductRow;
  product_recommendations: ProductRecommendationRow;
  saved_products: SavedProductRow;
  files: FileRow;
};

export type PetLogTableName = keyof PetLogDatabase;
export type PetLogTableRow<TableName extends PetLogTableName> = PetLogDatabase[TableName];

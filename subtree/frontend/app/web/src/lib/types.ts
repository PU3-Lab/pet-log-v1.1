export type RecordCategory = "meal" | "walk" | "stool" | "medical" | "behavior";

export type RecordCategoryChoice = RecordCategory | "all";

export type RecordStatus = "normal" | "notice" | "alert";

export type InsightSeverity = "info" | "notice" | "alert";

export type ExtractedMeasurement = {
  label: string;
  value: string;
};

export type StructuredRecordCandidate = {
  title: string;
  detail: string;
  category: RecordCategory;
  status: RecordStatus;
  confidence: number;
  needsConfirmation: boolean;
  measurements?: string[];
};

export type StructuredRecord = {
  sourceText: string;
  normalizedSummary: string;
  suggestedCategory: RecordCategory;
  detectedCategories?: RecordCategory[];
  confidence: number;
  measurements: ExtractedMeasurement[];
  needsConfirmation: boolean;
  candidates?: StructuredRecordCandidate[];
};

export type AiInsight = {
  severity: InsightSeverity;
  title: string;
  reason: string;
  sourceRecordIds?: string[];
  actionHref?: string | null;
};

export type AiSuggestion = {
  title: string;
  action: string;
  reason: string;
  actionHref?: string | null;
  severity?: InsightSeverity;
  sourceRecordIds?: string[];
};

export type PetProfile = {
  id?: string;
  name: string;
  breed: string;
  age: string;
  sex: string;
  weight: string;
  birthday: string;
  personality: string;
  notes: string[];
  photoDataUrl?: string;
};

export type RecordEntry = {
  id: string;
  time: string;
  date: string;
  batchId?: string;
  recordedAt?: string;
  category: RecordCategory;
  categoryChoice?: RecordCategoryChoice;
  title: string;
  detail: string;
  status: RecordStatus;
  structured?: StructuredRecord;
};

export type ScheduleCategory = "vaccination" | "medication" | "checkup" | "grooming" | "food";

export type ScheduleTone = "green" | "orange" | "red" | "blue";

export type CareSchedule = {
  id: string;
  category: ScheduleCategory;
  title: string;
  dueDate: string;
  repeatLabel: string;
  note: string;
  isDone: boolean;
};

export type ScheduleStatus = {
  label: string;
  tone: ScheduleTone;
  dayDiff: number;
};

export type SuggestionCategory = "행동" | "건강" | "생활";

export type SuggestionTone = "green" | "orange" | "blue";

export type Suggestion = {
  id: string;
  category: SuggestionCategory;
  title: string;
  detail: string;
  action: string;
  actionHref: string;
  tone: SuggestionTone;
};

export type CareNotificationTone = "green" | "orange" | "red" | "blue";

export type CareNotificationCategory = "기록" | "주의" | "행동 변화" | "일정";

export type NotificationPreferences = {
  missingRecord: boolean;
  alert: boolean;
  schedule: boolean;
};

export type ExpansionState = {
  sharedCare: Record<string, unknown>;
  hospital: Record<string, unknown>;
  shopping: Record<string, unknown>;
};

export type PetLogState = {
  version: 1;
  profile: PetProfile;
  records: RecordEntry[];
  schedules: CareSchedule[];
  settings: AppSettings;
  readNotificationIds: string[];
  expansionState: ExpansionState;
};

export type AppSettings = {
  notificationPreferences: NotificationPreferences;
  aiInsightEnabled: boolean;
};

export type ChatbotMessageRole = "user" | "assistant";

export type ChatbotMessage = {
  id: string;
  role: ChatbotMessageRole;
  content: string;
  createdAt: string;
  referencedRecordIds?: string[];
  safetyNotice?: string;
};

export type ChatbotThread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatbotMessage[];
};

export type CareNotification = {
  id: string;
  category: CareNotificationCategory;
  title: string;
  detail: string;
  action: string;
  actionHref: string;
  dueLabel: string;
  tone: CareNotificationTone;
  createdAt: string;
  isRead: boolean;
};

export type MetricSeries = {
  id: "meal" | "activity" | "weight";
  label: string;
  unit: string;
  values: number[];
  trend: string;
};

export type CommunityBoard = "유기동물" | "용품 나눔" | "자유게시판" | "행동 고민" | "후기";

export type CommunityFeed = "인기글" | "최신글";

export type CommunityPost = {
  id: string;
  board: CommunityBoard;
  title: string;
  body: string;
  authorName: string;
  createdAt: string;
  comments: number;
  likes: number;
  distance?: string;
  locationLabel?: string;
  feeds: CommunityFeed[];
  tags?: string[];
};

export type CommunityComment = {
  id: string;
  postId: string;
  authorName: string;
  body: string;
  createdAt: string;
};

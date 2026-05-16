from __future__ import annotations

from typing import Any, Literal, NotRequired, TypeAlias, TypedDict

UUID: TypeAlias = str
ISODateString: TypeAlias = str
ISODateTimeString: TypeAlias = str
DecimalNumber: TypeAlias = float
JsonObject: TypeAlias = dict[str, Any]

RecordCategory: TypeAlias = Literal["meal", "walk", "stool", "medical", "behavior"]
RecordStatus: TypeAlias = Literal["normal", "notice", "alert"]
ScheduleCategory: TypeAlias = Literal["vaccination", "medication", "checkup", "grooming", "food"]
ChatbotMessageRole: TypeAlias = Literal["user", "assistant"]
AiProviderId: TypeAlias = Literal["mock", "openai"]
RecordInputSource: TypeAlias = Literal["manual", "voice", "ai_preview"]
SharedCareRole: TypeAlias = Literal["공동 보호자", "기록 담당", "읽기 전용"]
SharedCareMemberStatus: TypeAlias = Literal["active", "removed"]
SharedCareInvitationStatus: TypeAlias = Literal["pending", "accepted", "rejected", "canceled", "expired"]
HospitalReportStatus: TypeAlias = Literal["draft", "shared", "archived"]
FilePurpose: TypeAlias = Literal["profile_photo", "record_attachment", "product_image"]


class UserRow(TypedDict):
    id: UUID
    email: str
    display_name: str | None
    created_at: ISODateTimeString
    updated_at: ISODateTimeString
    deleted_at: ISODateTimeString | None


class PetRow(TypedDict):
    id: UUID
    owner_user_id: UUID
    name: str
    breed: str
    age_label: str | None
    sex_label: str | None
    weight_label: str | None
    birthday: ISODateString | None
    personality: str | None
    notes: list[str]
    photo_file_id: UUID | None
    created_at: ISODateTimeString
    updated_at: ISODateTimeString
    deleted_at: ISODateTimeString | None


class PetRecordRow(TypedDict):
    id: UUID
    pet_id: UUID
    created_by_user_id: UUID
    recorded_at: ISODateTimeString
    category: RecordCategory
    title: str
    detail: str
    status: RecordStatus
    source: RecordInputSource
    created_at: ISODateTimeString
    updated_at: ISODateTimeString
    deleted_at: ISODateTimeString | None


class StructuredRecordRow(TypedDict):
    id: UUID
    record_id: UUID | None
    pet_id: UUID
    source_text: str
    normalized_summary: str
    suggested_category: RecordCategory
    confidence: DecimalNumber
    needs_confirmation: bool
    provider: AiProviderId
    model: str | None
    raw_response: JsonObject | None
    created_at: ISODateTimeString


class StructuredRecordMeasurementRow(TypedDict):
    id: UUID
    structured_record_id: UUID
    label: str
    value_text: str
    numeric_value: DecimalNumber | None
    unit: str | None
    created_at: ISODateTimeString


class CareScheduleRow(TypedDict):
    id: UUID
    pet_id: UUID
    created_by_user_id: UUID
    category: ScheduleCategory
    title: str
    due_date: ISODateString
    repeat_label: str
    note: str
    is_done: bool
    completed_at: ISODateTimeString | None
    created_at: ISODateTimeString
    updated_at: ISODateTimeString
    deleted_at: ISODateTimeString | None


class AppSettingsRow(TypedDict):
    id: UUID
    user_id: UUID
    pet_id: UUID | None
    missing_record_notification: bool
    alert_notification: bool
    schedule_notification: bool
    ai_insight_enabled: bool
    created_at: ISODateTimeString
    updated_at: ISODateTimeString


class NotificationReadRow(TypedDict):
    id: UUID
    user_id: UUID
    pet_id: UUID
    notification_id: str
    read_at: ISODateTimeString


class ChatbotThreadRow(TypedDict):
    id: UUID
    user_id: UUID
    pet_id: UUID
    title: str
    created_at: ISODateTimeString
    updated_at: ISODateTimeString
    deleted_at: ISODateTimeString | None


class ChatbotMessageRow(TypedDict):
    id: UUID
    thread_id: UUID
    role: ChatbotMessageRole
    content: str
    safety_notice: str | None
    referenced_record_ids: list[UUID]
    provider: AiProviderId | None
    model: str | None
    created_at: ISODateTimeString


class PreparedSharedCareInvite(TypedDict):
    id: str
    target: str
    role: SharedCareRole
    status: Literal["초대 준비"]


class SharedCareState(TypedDict):
    inviteTarget: str
    selectedRole: SharedCareRole
    inviteDraftMessage: str
    preparedInvites: list[PreparedSharedCareInvite]
    notificationSharingEnabled: bool


class HospitalState(TypedDict):
    symptomMemo: str
    locationStatus: Literal["idle", "loading", "ready", "blocked"]
    selectedHospitalId: NotRequired[str]
    checkedChecklistItems: list[str]


class ShoppingState(TypedDict):
    activeFilter: Literal["전체", "사료", "건강 용품", "케어 용품", "생활 용품"]
    expandedReasonId: str | None
    savedRecommendationIds: list[str]


class ExpansionStateRow(TypedDict):
    id: UUID
    user_id: UUID
    pet_id: UUID
    shared_care_state: SharedCareState
    hospital_state: HospitalState
    shopping_state: ShoppingState
    created_at: ISODateTimeString
    updated_at: ISODateTimeString


class SharedCareMemberRow(TypedDict):
    id: UUID
    pet_id: UUID
    user_id: UUID
    role: SharedCareRole
    status: SharedCareMemberStatus
    created_at: ISODateTimeString
    updated_at: ISODateTimeString


class SharedCareInvitationRow(TypedDict):
    id: UUID
    pet_id: UUID
    invited_by_user_id: UUID
    target: str
    role: SharedCareRole
    status: SharedCareInvitationStatus
    message: str | None
    expires_at: ISODateTimeString | None
    created_at: ISODateTimeString
    updated_at: ISODateTimeString


class HospitalRow(TypedDict):
    id: UUID
    name: str
    address: str
    phone: str | None
    latitude: DecimalNumber | None
    longitude: DecimalNumber | None
    opening_hours: JsonObject | None
    created_at: ISODateTimeString
    updated_at: ISODateTimeString


class HospitalReportRow(TypedDict):
    id: UUID
    pet_id: UUID
    created_by_user_id: UUID
    hospital_id: UUID | None
    symptom_memo: str | None
    summary: str
    record_ids: list[UUID]
    status: HospitalReportStatus
    share_token: str | None
    shared_at: ISODateTimeString | None
    created_at: ISODateTimeString
    updated_at: ISODateTimeString


class ProductRow(TypedDict):
    id: UUID
    name: str
    category: str
    description: str | None
    image_file_id: UUID | None
    partner_url: str | None
    is_active: bool
    created_at: ISODateTimeString
    updated_at: ISODateTimeString


class ProductRecommendationRow(TypedDict):
    id: UUID
    pet_id: UUID
    product_id: UUID
    reason: str
    source_record_ids: list[UUID]
    score: DecimalNumber | None
    created_at: ISODateTimeString


class SavedProductRow(TypedDict):
    id: UUID
    user_id: UUID
    pet_id: UUID
    product_id: UUID
    created_at: ISODateTimeString


class FileRow(TypedDict):
    id: UUID
    owner_user_id: UUID
    pet_id: UUID | None
    purpose: FilePurpose
    storage_key: str
    mime_type: str
    byte_size: int
    created_at: ISODateTimeString
    deleted_at: ISODateTimeString | None


PetLogDatabase: TypeAlias = dict[
    Literal[
        "users",
        "pets",
        "pet_records",
        "structured_records",
        "structured_record_measurements",
        "care_schedules",
        "app_settings",
        "notification_reads",
        "chatbot_threads",
        "chatbot_messages",
        "expansion_states",
        "shared_care_members",
        "shared_care_invitations",
        "hospitals",
        "hospital_reports",
        "products",
        "product_recommendations",
        "saved_products",
        "files",
    ],
    type[TypedDict],
]

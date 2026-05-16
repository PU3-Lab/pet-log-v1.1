from __future__ import annotations

from typing import Literal, TypeAlias

RecordCategory: TypeAlias = Literal["meal", "walk", "stool", "medical", "behavior"]
RecordStatus: TypeAlias = Literal["normal", "notice", "alert"]
RecordInputSource: TypeAlias = Literal["manual", "voice", "ai_preview", "quick_action"]
InsightSeverity: TypeAlias = Literal["info", "notice", "alert"]
ConversationMode: TypeAlias = Literal["care_question", "pet_chat"]
FilePurpose: TypeAlias = Literal["profile_photo", "record_attachment", "product_image"]

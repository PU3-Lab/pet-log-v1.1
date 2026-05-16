"""기록 누락 알림 DB 저장 파이프라인 테스트. RED phase."""
from __future__ import annotations

import sqlite3
import unittest

from application.dto import NotificationCandidate
from domain.models import CareInsight, ContextAnalysisResult, PetProfile
from infrastructure.database import initialize_schema
from infrastructure.notifications.policy import NotificationPolicy
from infrastructure.repositories.notification_repository import NotificationRepository


class TestNotificationRepositoryUpsert(unittest.TestCase):
    def setUp(self) -> None:
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        initialize_schema(self.conn)
        self.repo = NotificationRepository(self.conn)

    def test_upsert_creates_new_notification_for_new_dedupe_key(self) -> None:
        candidate = NotificationCandidate(
            title="밥 기록 누락",
            message="오늘 식사 기록이 없습니다.",
            kind="missing_record",
            dedupe_key="missing_record:abc123",
        )

        notification = self.repo.upsert_from_candidate(
            pet_id="pet-1",
            candidate=candidate,
            category="기록",
            action="기록 추가",
            action_href="/records/new",
            tone="orange",
        )

        self.assertIsNotNone(notification)
        self.assertEqual(notification.title, "밥 기록 누락")

    def test_upsert_returns_existing_notification_for_duplicate_dedupe_key(self) -> None:
        candidate = NotificationCandidate(
            title="밥 기록 누락",
            message="오늘 식사 기록이 없습니다.",
            kind="missing_record",
            dedupe_key="missing_record:abc123",
        )

        first = self.repo.upsert_from_candidate("pet-1", candidate, "기록", "기록 추가", "/records/new", "orange")
        second = self.repo.upsert_from_candidate("pet-1", candidate, "기록", "기록 추가", "/records/new", "orange")

        self.assertEqual(first.id, second.id)

    def test_find_by_dedupe_key_returns_none_for_unknown_key(self) -> None:
        result = self.repo.find_by_dedupe_key("missing_record:unknown")
        self.assertIsNone(result)

    def test_find_by_dedupe_key_returns_notification_after_upsert(self) -> None:
        candidate = NotificationCandidate(
            title="배변 기록 누락",
            message="배변 기록이 없습니다.",
            kind="missing_record",
            dedupe_key="missing_record:xyz789",
        )
        self.repo.upsert_from_candidate("pet-1", candidate, "기록", "기록 추가", "/records/new", "orange")

        result = self.repo.find_by_dedupe_key("missing_record:xyz789")

        self.assertIsNotNone(result)
        self.assertEqual(result.title, "배변 기록 누락")  # type: ignore[union-attr]

    def test_list_for_pet_returns_upserted_notification(self) -> None:
        candidate = NotificationCandidate(
            title="산책 기록 누락",
            message="산책 기록이 없습니다.",
            kind="missing_record",
            dedupe_key="missing_record:walk01",
        )
        self.repo.upsert_from_candidate("pet-1", candidate, "기록", "기록 추가", "/records/new", "orange")

        items = self.repo.list_for_pet("pet-1")

        titles = [n.title for n in items]
        self.assertIn("산책 기록 누락", titles)

    def test_upsert_does_not_create_duplicate_in_list(self) -> None:
        candidate = NotificationCandidate(
            title="물 기록 누락",
            message="물 기록이 없습니다.",
            kind="missing_record",
            dedupe_key="missing_record:water01",
        )
        self.repo.upsert_from_candidate("pet-1", candidate, "기록", "기록 추가", "/records/new", "orange")
        self.repo.upsert_from_candidate("pet-1", candidate, "기록", "기록 추가", "/records/new", "orange")

        items = self.repo.list_for_pet("pet-1")
        count = sum(1 for n in items if n.title == "물 기록 누락")
        self.assertEqual(count, 1)


class TestMissingRecordPersistencePipeline(unittest.TestCase):
    """end-to-end: policy → repository 저장 → list_for_pet 조회."""

    def setUp(self) -> None:
        self.conn = sqlite3.connect(":memory:")
        self.conn.row_factory = sqlite3.Row
        initialize_schema(self.conn)
        self.repo = NotificationRepository(self.conn)
        self.policy = NotificationPolicy()

    def test_missing_record_candidate_is_persisted(self) -> None:
        pet = PetProfile(id="pet-1", name="초코")
        context = ContextAnalysisResult(
            missing_record_insights=(
                CareInsight(severity="notice", title="밥 기록 없음", reason="오늘 식사 기록이 없습니다."),
            )
        )

        candidates = self.policy.plan(pet, context, (), ())
        missing = [c for c in candidates if c.kind == "missing_record"]

        for candidate in missing:
            self.repo.upsert_from_candidate(
                pet_id=pet.id,
                candidate=candidate,
                category="기록",
                action="기록 추가",
                action_href="/records/new",
                tone="orange",
            )

        saved = self.repo.list_for_pet(pet.id)
        titles = [n.title for n in saved]
        self.assertIn("밥 기록 없음", titles)

    def test_calling_twice_does_not_duplicate(self) -> None:
        pet = PetProfile(id="pet-1", name="초코")
        context = ContextAnalysisResult(
            missing_record_insights=(
                CareInsight(severity="notice", title="밥 기록 없음", reason="오늘 식사 기록이 없습니다."),
            )
        )
        candidates = self.policy.plan(pet, context, (), ())
        missing = [c for c in candidates if c.kind == "missing_record"]

        def _persist_all() -> None:
            for c in missing:
                self.repo.upsert_from_candidate(
                    pet_id=pet.id, candidate=c,
                    category="기록", action="기록 추가", action_href="/records/new", tone="orange",
                )

        _persist_all()
        _persist_all()

        saved = self.repo.list_for_pet(pet.id)
        count = sum(1 for n in saved if n.title == "밥 기록 없음")
        self.assertEqual(count, 1)


if __name__ == "__main__":
    unittest.main()

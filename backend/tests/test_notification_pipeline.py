"""Tests for on-the-fly notification pipeline — RED phase (should fail before implementation)."""
from __future__ import annotations

import unittest
from datetime import date, timedelta

from fastapi.testclient import TestClient

from application.agents.context_analysis import ContextAnalysisAgent
from composition import AppContext
from infrastructure.database import connect
from infrastructure.notifications.policy import NotificationPolicy
from infrastructure.policies.missing_record_policy import MissingRecordPolicy
from infrastructure.policies.pattern_analyzer import PatternAnalyzer
from infrastructure.repositories import NotificationRepository, PetProfileRepository, RecordRepository, ScheduleRepository
from infrastructure.seed_data import SAMPLE_PET_ID, seed_default_data
from presentation.http.app import create_app


def _build_client(connection) -> TestClient:
    app = create_app()
    app.state.app_context = AppContext(
        pet_log_agent_pipeline=None,
        pet_profile_reader=PetProfileRepository(connection=connection),
        speech_to_text=None,
        risk_detection_agent=None,
        context_analysis_agent=ContextAnalysisAgent(PatternAnalyzer(), MissingRecordPolicy()),
        suggestion_agent=None,
        record_reader=RecordRepository(connection=connection),
        schedule_reader=ScheduleRepository(connection=connection),
        notification_repository=NotificationRepository(connection=connection),
        notification_policy=NotificationPolicy(),
    )
    return TestClient(app)


def _build_client_no_agents(connection) -> TestClient:
    """Client without agents — should gracefully return empty notifications."""
    app = create_app()
    app.state.app_context = AppContext(
        pet_log_agent_pipeline=None,
        pet_profile_reader=PetProfileRepository(connection=connection),
        speech_to_text=None,
        risk_detection_agent=None,
        context_analysis_agent=None,
        suggestion_agent=None,
        record_reader=RecordRepository(connection=connection),
        schedule_reader=ScheduleRepository(connection=connection),
        notification_repository=NotificationRepository(connection=connection),
    )
    return TestClient(app)


class TestNotificationPipelineComputation(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = connect(":memory:")
        seed_default_data(self.connection)
        self.connection.execute("UPDATE pets SET owner_user_id = 'local-user'")
        self.connection.commit()
        self.client = _build_client(self.connection)
        self.pet_id = SAMPLE_PET_ID
        self.today = date.today().isoformat()

    def tearDown(self) -> None:
        self.connection.close()

    def test_pet_with_no_records_gets_missing_record_notification(self) -> None:
        # Arrange: remove all records so MissingRecordPolicy fires
        self.connection.execute("DELETE FROM pet_records WHERE pet_id = ?", (self.pet_id,))
        self.connection.commit()

        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        notifications = data["notifications"]
        categories = [n["category"] for n in notifications]
        self.assertIn("기록", categories)

    def test_pet_with_alert_records_gets_risk_notification(self) -> None:
        # Arrange: insert 2 records with status=alert so PatternAnalyzer fires with severity=alert
        self.connection.execute(
            "INSERT INTO pet_records (id, pet_id, category, title, detail, status, recorded_at, source) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("alert-1", self.pet_id, "meal", "식욕 저하", "아예 안 먹음", "alert", self.today + "T08:00:00Z", "manual"),
        )
        self.connection.execute(
            "INSERT INTO pet_records (id, pet_id, category, title, detail, status, recorded_at, source) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            ("alert-2", self.pet_id, "stool", "혈변", "붉은 점이 보임", "alert", self.today + "T09:00:00Z", "manual"),
        )
        self.connection.commit()

        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        notifications = data["notifications"]
        categories = [n["category"] for n in notifications]
        self.assertIn("주의", categories)

    def test_pet_with_due_schedule_gets_schedule_notification(self) -> None:
        # Arrange: insert a schedule due within 7 days
        due_date = (date.today() + timedelta(days=3)).isoformat()
        self.connection.execute(
            "INSERT INTO care_schedules (id, pet_id, category, title, due_date, repeat_label, note, is_done) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, 0)",
            ("sched-1", self.pet_id, "vaccine", "백신 접종", due_date, "1년마다", "", ),
        )
        self.connection.commit()

        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        notifications = data["notifications"]
        categories = [n["category"] for n in notifications]
        self.assertIn("일정", categories)

    def test_notification_id_uses_dedupe_key_format(self) -> None:
        # Arrange: no records so missing_record candidate is generated
        self.connection.execute("DELETE FROM pet_records WHERE pet_id = ?", (self.pet_id,))
        self.connection.commit()

        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        notifications = data["notifications"]
        self.assertTrue(len(notifications) > 0)
        for n in notifications:
            self.assertIn(":", n["id"], msg=f"id should contain ':' but got {n['id']!r}")

    def test_notifications_have_required_fields(self) -> None:
        # Arrange: no records so at least one notification is generated
        self.connection.execute("DELETE FROM pet_records WHERE pet_id = ?", (self.pet_id,))
        self.connection.commit()

        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        notifications = data["notifications"]
        self.assertTrue(len(notifications) > 0)
        for n in notifications:
            for field in ("id", "category", "title", "detail", "action", "actionHref", "dueLabel", "tone", "isRead"):
                self.assertIn(field, n, msg=f"Missing field {field!r}")

    def test_unread_notifications_have_is_read_false(self) -> None:
        # Arrange: no records → notification generated, not yet marked read
        self.connection.execute("DELETE FROM pet_records WHERE pet_id = ?", (self.pet_id,))
        self.connection.commit()

        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        notifications = data["notifications"]
        self.assertTrue(all(not n["isRead"] for n in notifications))

    def test_read_state_applied_to_computed_notification(self) -> None:
        # Arrange: no records → missing_record notification generated
        self.connection.execute("DELETE FROM pet_records WHERE pet_id = ?", (self.pet_id,))
        self.connection.commit()

        # Get the notification id
        get_resp = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")
        notifications = get_resp.json()["data"]["notifications"]
        self.assertTrue(len(notifications) > 0)
        notification_id = notifications[0]["id"]

        # Mark it as read
        self.client.put(
            f"/api/v1/notifications/read?pet_id={self.pet_id}",
            json={"readNotificationIds": [notification_id]},
        )

        # Fetch again — should be read
        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")
        data = response.json()["data"]
        notification = next(n for n in data["notifications"] if n["id"] == notification_id)
        self.assertTrue(notification["isRead"])

    def test_no_agents_returns_empty_notifications(self) -> None:
        # Arrange: client without agents configured
        client = _build_client_no_agents(self.connection)

        response = client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertIsInstance(data["notifications"], list)


if __name__ == "__main__":
    unittest.main()

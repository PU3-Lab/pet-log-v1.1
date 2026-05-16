"""Tests for notification API endpoints - RED phase (should fail before implementation)."""
from __future__ import annotations

import unittest

from fastapi.testclient import TestClient

from composition import AppContext
from infrastructure.database import connect
from infrastructure.repositories import NotificationRepository, PetProfileRepository, RecordRepository, ScheduleRepository
from infrastructure.seed_data import SAMPLE_PET_ID
from presentation.http.app import create_app


def _build_client(connection) -> TestClient:
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


class TestNotificationRoutes(unittest.TestCase):
    def setUp(self) -> None:
        self.connection = connect(":memory:")
        from infrastructure.seed_data import seed_default_data
        seed_default_data(self.connection)
        self.connection.execute("UPDATE pets SET owner_user_id = 'local-user'")
        self.connection.commit()
        self.client = _build_client(self.connection)
        self.pet_id = SAMPLE_PET_ID

    def tearDown(self) -> None:
        self.connection.close()

    # ── GET /notifications ──────────────────────────────────────────────────

    def test_get_notifications_returns_200(self) -> None:
        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        self.assertEqual(response.status_code, 200)

    def test_get_notifications_returns_notifications_list(self) -> None:
        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        self.assertIn("notifications", data)
        self.assertIsInstance(data["notifications"], list)

    def test_get_notifications_returns_read_notification_ids(self) -> None:
        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        self.assertIn("readNotificationIds", data)
        self.assertIsInstance(data["readNotificationIds"], list)

    def test_get_notifications_items_have_required_fields(self) -> None:
        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        notifications = data["notifications"]
        if notifications:
            for n in notifications:
                self.assertIn("id", n)
                self.assertIn("category", n)
                self.assertIn("title", n)
                self.assertIn("detail", n)
                self.assertIn("isRead", n)

    # ── PUT /notifications/read ─────────────────────────────────────────────

    def test_put_notifications_read_returns_200(self) -> None:
        body = {"readNotificationIds": ["missing-stool", "follow-up-alert"]}

        response = self.client.put(
            f"/api/v1/notifications/read?pet_id={self.pet_id}",
            json=body,
        )

        self.assertEqual(response.status_code, 200)

    def test_put_notifications_read_returns_read_ids(self) -> None:
        ids = ["missing-stool", "follow-up-alert"]
        body = {"readNotificationIds": ids}

        response = self.client.put(
            f"/api/v1/notifications/read?pet_id={self.pet_id}",
            json=body,
        )

        data = response.json()["data"]
        self.assertIn("readNotificationIds", data)
        self.assertEqual(sorted(data["readNotificationIds"]), sorted(ids))

    def test_put_notifications_read_persists_ids_for_subsequent_get(self) -> None:
        ids = ["missing-stool"]
        self.client.put(
            f"/api/v1/notifications/read?pet_id={self.pet_id}",
            json={"readNotificationIds": ids},
        )

        response = self.client.get(f"/api/v1/notifications?pet_id={self.pet_id}")

        data = response.json()["data"]
        self.assertIn("missing-stool", data["readNotificationIds"])

    def test_put_notifications_read_with_empty_list_clears_state(self) -> None:
        self.client.put(
            f"/api/v1/notifications/read?pet_id={self.pet_id}",
            json={"readNotificationIds": ["some-id"]},
        )

        response = self.client.put(
            f"/api/v1/notifications/read?pet_id={self.pet_id}",
            json={"readNotificationIds": []},
        )

        data = response.json()["data"]
        self.assertEqual(data["readNotificationIds"], [])

    def test_put_notifications_read_is_isolated_per_pet(self) -> None:
        other_pet_id = "pet_01JCM7V8H9Q2K4N6R8T0D4E5F6"
        self.client.put(
            f"/api/v1/notifications/read?pet_id={self.pet_id}",
            json={"readNotificationIds": ["missing-stool"]},
        )

        response = self.client.get(f"/api/v1/notifications?pet_id={other_pet_id}")

        data = response.json()["data"]
        self.assertNotIn("missing-stool", data["readNotificationIds"])

    # ── Repository read-state storage ────────────────────────────────────────

    def test_notification_repository_stores_and_retrieves_read_ids(self) -> None:
        repo = NotificationRepository(connection=self.connection)
        ids = ("missing-stool", "follow-up-alert")

        repo.set_read_ids(self.pet_id, ids)
        stored = repo.get_read_ids(self.pet_id)

        self.assertEqual(sorted(stored), sorted(ids))

    def test_notification_repository_set_read_ids_replaces_previous(self) -> None:
        repo = NotificationRepository(connection=self.connection)
        repo.set_read_ids(self.pet_id, ("old-id",))

        repo.set_read_ids(self.pet_id, ("new-id-1", "new-id-2"))
        stored = repo.get_read_ids(self.pet_id)

        self.assertNotIn("old-id", stored)
        self.assertIn("new-id-1", stored)
        self.assertIn("new-id-2", stored)

    def test_notification_repository_get_read_ids_returns_empty_for_new_pet(self) -> None:
        repo = NotificationRepository(connection=self.connection)

        result = repo.get_read_ids("unknown-pet-id")

        self.assertEqual(result, ())


if __name__ == "__main__":
    unittest.main()

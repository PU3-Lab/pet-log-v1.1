import json
import sqlite3
import unittest
from datetime import datetime
from infrastructure.database import connect, initialize_schema
from infrastructure.repositories import PetProfileRepository, NotificationRepository
from domain.models import Notification

class TestNewRepositories(unittest.TestCase):
    def setUp(self):
        self.connection = connect(":memory:")
        initialize_schema(self.connection)
        self.pet_repo = PetProfileRepository(connection=self.connection)
        self.notif_repo = NotificationRepository(connection=self.connection)

    def tearDown(self):
        self.connection.close()

    def test_pet_profile_list_and_create(self):
        # Initial state (connect() seeds 3 pets by default, so we check that first)
        pets = self.pet_repo.list_pets(owner_user_id="local-user")
        initial_count = len(pets)
        
        # Create a new pet
        new_pet = self.pet_repo.create_pet(name="New Pet", species="cat", breed="Mix")
        self.assertEqual(new_pet.name, "New Pet")
        self.assertEqual(new_pet.species, "cat")
        
        # List again
        pets = self.pet_repo.list_pets(owner_user_id="local-user")
        self.assertEqual(len(pets), initial_count + 1)
        self.assertTrue(any(p.id == new_pet.id for p in pets))

    def test_pet_profile_delete(self):
        new_pet = self.pet_repo.create_pet(name="To Delete")
        pet_id = new_pet.id
        
        # Delete pet
        success = self.pet_repo.delete_pet(pet_id)
        self.assertTrue(success)
        
        # Should not be in list
        pets = self.pet_repo.list_pets(owner_user_id="local-user")
        self.assertFalse(any(p.id == pet_id for p in pets))
        
        # Should raise KeyError on get_pet
        with self.assertRaises(KeyError):
            self.pet_repo.get_pet(pet_id)

    def test_notification_repository(self):
        pet_id = "pet-1"
        # Create notification
        notif = self.notif_repo.create(
            pet_id=pet_id,
            category="alert",
            title="Test Alert",
            detail="Test Detail",
            action="Check",
            action_href="/test",
            due_label="Today",
            tone="warning"
        )
        self.assertIsNotNone(notif.id)
        notif_id = notif.id
        
        # List notifications
        notifs = self.notif_repo.list_for_pet(pet_id)
        self.assertEqual(len(notifs), 1)
        self.assertEqual(notifs[0].title, "Test Alert")
        self.assertIsNone(notifs[0].read_at)
        
        # Mark as read
        success = self.notif_repo.mark_as_read(notif_id)
        self.assertTrue(success)
        
        # Check read status
        notifs = self.notif_repo.list_for_pet(pet_id)
        self.assertIsNotNone(notifs[0].read_at)
        
        # Mark all as read
        self.notif_repo.create(
            pet_id=pet_id, category="info", title="Info 2", detail="", 
            action="", action_href="", due_label="", tone="info"
        )
        self.notif_repo.mark_all_as_read(pet_id)
        
        notifs = self.notif_repo.list_for_pet(pet_id)
        self.assertTrue(all(n.read_at is not None for n in notifs))

    def test_notification_repository_reads_rows_when_sqlite_uses_full_column_names(self):
        self.connection.execute("PRAGMA short_column_names = OFF")
        self.connection.execute("PRAGMA full_column_names = ON")
        notif = self.notif_repo.create(
            pet_id="pet-1",
            category="alert",
            title="Full Names",
            detail="Detail",
            action="Check",
            action_href="/test",
            due_label="Today",
            tone="warning",
        )

        notifications = self.notif_repo.list_for_pet("pet-1")
        found = self.notif_repo.find_by_dedupe_key("missing")

        self.assertEqual(tuple(item.id for item in notifications), (notif.id,))
        self.assertIsNone(found)

if __name__ == "__main__":
    unittest.main()

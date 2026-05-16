from __future__ import annotations

from domain.models import PetProfile, StructuredRecordCandidate


class PhotoRecordUnderstandingAgent:
    def __init__(self, image_understanding_provider) -> None:
        self._image_understanding_provider = image_understanding_provider

    def understand(
        self,
        pet: PetProfile,
        image: bytes,
        content_type: str,
        user_note: str | None = None,
    ) -> StructuredRecordCandidate:
        return self._image_understanding_provider.understand(pet, image, content_type, user_note)

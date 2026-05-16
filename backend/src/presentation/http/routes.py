from __future__ import annotations

from fastapi import APIRouter

from presentation.http.community_routes import build_community_router
from presentation.http.file_routes import build_file_router
from presentation.http.hospital_routes import build_hospital_router
from presentation.http.notification_routes import build_notification_router
from presentation.http.pet_log_routes import build_pet_log_router
from presentation.http.shopping_routes import build_shopping_router
from presentation.http.speech_routes import build_speech_router


def build_router() -> APIRouter:
    router = APIRouter()
    router.include_router(build_pet_log_router())
    router.include_router(build_file_router())
    router.include_router(build_speech_router())
    router.include_router(build_hospital_router())
    router.include_router(build_notification_router())
    router.include_router(build_shopping_router())
    router.include_router(build_community_router())

    @router.get("/health")
    def health_check() -> dict[str, str]:
        return {"status": "ok"}

    return router

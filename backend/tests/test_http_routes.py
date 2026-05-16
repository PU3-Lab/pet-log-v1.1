import asyncio
import tempfile
import unittest
from datetime import date, datetime
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

from application.agents.hospital import KST, HospitalRecommendationResult
from application.dto import PetLogAgentResult
from composition import AppContext
from domain.models import (
    CareSchedule,
    CareSuggestion,
    ContextAnalysisResult,
    PetProfile,
    PetRecord,
    ShoppingRecommendation,
    StructuredRecordCandidate,
    VeterinaryHospitalRecommendation,
)
from infrastructure.database import connect
from infrastructure.maps import GooglePlacesConfigurationError
from infrastructure.repositories import CommunityRepository, FileRepository, PetProfileRepository
from infrastructure.repositories.file_repository import LocalFileStorage
from infrastructure.seed_data import SAMPLE_PET_ID, seed_default_data
from presentation.http.app import create_app


class FakePetLogAgentPipeline:
    def __init__(self) -> None:
        self.handled_input = None

    def handle(self, input):
        self.handled_input = input
        return PetLogAgentResult(
            candidates=(
                StructuredRecordCandidate(
                    title="아침 식사",
                    detail="사료를 조금 남겼어요.",
                    category="meal",
                    status="notice",
                    confidence=0.82,
                    needs_confirmation=True,
                    measurements=("사료 조금 남김",),
                ),
            ),
        )


class FakePetProfileReader:
    def __init__(self) -> None:
        self.pets = {
            "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3": PetProfile(
                id="pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                name="초코",
                breed="말티푸",
                species="dog",
                age_label="3살",
                sex_label="암컷",
                weight_label="3.4kg",
                birthday="2018.5.11",
                personality="저녁 산책을 좋아해요",
                notes=("아침 식사는 천천히 먹는 편",),
            )
        }

    def get_pet(self, pet_id: str) -> PetProfile:
        return self.pets[pet_id]

    def list_pets(self) -> tuple[PetProfile, ...]:
        return tuple(self.pets.values())


class FakeRecordReader:
    def list_recent(self, pet_id: str, lookback_days: int):
        return (
            PetRecord(
                id="record-1",
                pet_id=pet_id,
                category="meal",
                title="아침 식사",
                detail="사료를 조금 남겼어요.",
                status="notice",
                recorded_at="2026-05-09T08:10:00",
                source="manual",
            ),
        )


class FakeScheduleReader:
    def list_for_pet(self, pet_id: str):
        return (
            CareSchedule(
                id="schedule-1",
                pet_id=pet_id,
                category="checkup",
                title="정기 검진",
                due_date="2026-05-16",
                repeat_label="6개월마다",
                note="식사량 같이 상담",
                is_done=False,
            ),
        )

    def list_due_items(self, pet_id: str, days_ahead: int):
        return ()


class FakeContextAnalysisAgent:
    def analyze(self, pet, recent_records, due_items):
        return ContextAnalysisResult()


class FakeSuggestionAgent:
    def suggest(self, pet, context, safety_notices):
        return (
            CareSuggestion(
                title="식사 관리",
                action="식사량을 꾸준히 확인하세요.",
                reason="최근 식사 기록이 있어요.",
                source_record_ids=("record-1",),
            ),
        )


class FakeAppContext:
    def __init__(self) -> None:
        self.pet_log_agent_pipeline = FakePetLogAgentPipeline()
        self.pet_profile_reader = FakePetProfileReader()
        self.record_reader = FakeRecordReader()
        self.schedule_reader = FakeScheduleReader()
        self.context_analysis_agent = FakeContextAnalysisAgent()
        self.suggestion_agent = FakeSuggestionAgent()
        self.speech_to_text = FakeSpeechToText()
        self.text_to_speech = FakeTextToSpeech()
        self.shopping_agent = FakeShoppingAgent()
        self.hospital_recommendation_agent = FakeHospitalRecommendationAgent()
        self.closed = False

    def close(self) -> None:
        self.closed = True


class FakeSpeechToText:
    def __init__(self) -> None:
        self.transcribed_audio = None
        self.transcribed_content_type = None

    def transcribe(self, audio: bytes, content_type: str) -> str:
        self.transcribed_audio = audio
        self.transcribed_content_type = content_type
        return "오늘 아침 사료를 조금 남겼어"


class FakeSpeechTextCorrector:
    def __init__(self) -> None:
        self.corrected_text = "오늘 아침 사료를 조금 남겼어요."
        self.handled_text = None
        self.handled_pet_names = None

    def correct(self, text: str, pet_names: tuple[str, ...] = ()) -> str:
        self.handled_text = text
        self.handled_pet_names = pet_names
        return self.corrected_text


class FailingSpeechTextCorrector:
    def correct(self, text: str, pet_names: tuple[str, ...] = ()) -> str:
        raise RuntimeError("correction failed")


class FakeTextToSpeech:
    def __init__(self) -> None:
        self.synthesized_text = None
        self.synthesized_voice = None

    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        self.synthesized_text = text
        self.synthesized_voice = voice
        return f"{voice or 'default'}:{text}".encode("utf-8")


class AsyncioRunTextToSpeech(FakeTextToSpeech):
    def synthesize(self, text: str, voice: str | None = None) -> bytes:
        asyncio.run(self._save_audio())
        return super().synthesize(text, voice)

    async def _save_audio(self) -> None:
        await asyncio.sleep(0)


class FakeHospitalRecommendationAgent:
    def __init__(self) -> None:
        self.handled_query = None

    def recommend(self, query):
        self.handled_query = query
        return HospitalRecommendationResult(
            current_time=datetime(2026, 5, 11, 15, 30, tzinfo=KST),
            center_latitude=query.latitude,
            center_longitude=query.longitude,
            radius_meters=query.radius_meters,
            location_source=query.location_source,
            accuracy_meters=query.accuracy_meters,
            emergency_mode=query.emergency,
            recommendations=(
                VeterinaryHospitalRecommendation(
                    place_id="hospital-1",
                    name="24시 반려동물병원",
                    address="서울시 강남구",
                    phone_number="02-1234-5678",
                    google_maps_url="https://maps.google.com/?cid=1",
                    latitude=37.501,
                    longitude=127.001,
                    rating=4.6,
                    user_rating_count=42,
                    is_open_now=True,
                    is_24_hours=True,
                    weekday_text=("월요일: 24시간",),
                    distance_meters=130,
                    reason="24시간 영업으로 확인되어 현재 시각 기준 우선 추천합니다.",
                ),
            ),
        )


class FakeShoppingAgent:
    def __init__(self) -> None:
        self.handled_pet = None
        self.handled_text = None
        self.handled_records = None
        self.handled_suggestions = None

    def recommend(self, pet, text, records, suggestions=()):
        self.handled_pet = pet
        self.handled_text = text
        self.handled_records = records
        self.handled_suggestions = suggestions
        return (
            ShoppingRecommendation(
                title="반려견 사료",
                product_url="https://shopping.example/products/food",
                image_url="https://shopping.example/products/food.jpg",
                mall_name="샘플몰",
                lowest_price=12900,
                query="반려견 사료",
                reason="아침 식사 기록과 관련된 상품 추천",
                source_record_ids=("record-1",),
            ),
        )


class MissingGoogleMapsKeyHospitalAgent:
    def recommend(self, query):
        raise GooglePlacesConfigurationError("missing key")


class TestHttpRoutes(unittest.TestCase):
    def test_create_app_loads_dotenv_without_explicit_path(self):
        with patch("presentation.http.app.load_dotenv") as load_dotenv:
            create_app(app_context_factory=FakeAppContext)

        load_dotenv.assert_called_once_with(override=False)

    def test_health_route_returns_ok(self):
        client = TestClient(create_app(app_context_factory=FakeAppContext))

        response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok"})

    def test_community_routes_list_posts_and_detail(self):
        connection = connect(":memory:")
        seed_default_data(connection, today=date(2026, 5, 7))
        context = AppContext(
            pet_log_agent_pipeline=FakePetLogAgentPipeline(),
            pet_profile_reader=FakePetProfileReader(),
            speech_to_text=FakeSpeechToText(),
            community_repository=CommunityRepository(connection=connection),
            close=connection.close,
        )

        with TestClient(create_app(app_context=context)) as client:
            posts_response = client.get(
                "/api/v1/community/posts",
                params={"feed": "인기글", "board": "행동 고민"},
            )
            detail_response = client.get("/api/v1/community/posts/c1")

        self.assertEqual(posts_response.status_code, 200)
        self.assertEqual(
            posts_response.json()["data"]["posts"][0],
            {
                "id": "c1",
                "board": "행동 고민",
                "title": "말티즈 산책 줄면 쉽게 흥분하나요?",
                "body": "산책 시간이 줄어든 뒤 현관 앞에서 기다리거나 소리에 예민하게 반응하는 날이 늘었어요. 짧게라도 산책을 나누는 게 도움이 될까요?",
                "authorName": "코코 보호자",
                "createdAt": "2026-05-07T09:20:00",
                "comments": 2,
                "likes": 26,
                "feeds": ["인기글", "최신글"],
                "tags": ["산책", "흥분", "말티즈"],
            },
        )
        detail = detail_response.json()["data"]["post"]
        self.assertEqual(detail["meta"], "행동 고민 · 댓글 2 · 공감 26")
        self.assertEqual([comment["id"] for comment in detail["commentItems"]], ["comment-c1-1", "comment-c1-2"])

    def test_community_routes_do_not_expose_nearby_feed(self):
        client = TestClient(create_app(app_context_factory=FakeAppContext))

        response = client.get("/api/v1/community/boards")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["data"]["feeds"], ["인기글", "최신글"])

    def test_community_routes_paginates_posts_by_ten(self):
        connection = connect(":memory:")
        repository = CommunityRepository(connection=connection)
        connection.executemany(
            """
            INSERT INTO community_posts (id, board, title, body, author_name, created_at, likes, feeds, tags)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                (
                    f"page-post-{index:02d}",
                    "자유게시판",
                    f"글 {index}",
                    "본문입니다.",
                    "나",
                    f"2026-05-13T00:{index:02d}:00Z",
                    0,
                    '["최신글"]',
                    '["새 글"]',
                )
                for index in range(12)
            ),
        )
        connection.commit()
        context = AppContext(
            pet_log_agent_pipeline=FakePetLogAgentPipeline(),
            pet_profile_reader=FakePetProfileReader(),
            speech_to_text=FakeSpeechToText(),
            community_repository=repository,
            close=connection.close,
        )

        with TestClient(create_app(app_context=context)) as client:
            first_response = client.get(
                "/api/v1/community/posts",
                params={"feed": "최신글", "board": "자유게시판", "limit": 10, "offset": 0},
            )
            second_response = client.get(
                "/api/v1/community/posts",
                params={"feed": "최신글", "board": "자유게시판", "limit": 10, "offset": 10},
            )

        self.assertEqual(first_response.status_code, 200)
        self.assertEqual(len(first_response.json()["data"]["posts"]), 10)
        self.assertEqual(first_response.json()["data"]["totalCount"], 12)
        self.assertTrue(first_response.json()["data"]["hasMore"])
        self.assertEqual([post["id"] for post in second_response.json()["data"]["posts"]], ["page-post-01", "page-post-00"])
        self.assertEqual(second_response.json()["data"]["totalCount"], 12)
        self.assertFalse(second_response.json()["data"]["hasMore"])

    def test_community_routes_create_post_comment_and_reaction(self):
        connection = connect(":memory:")
        context = AppContext(
            pet_log_agent_pipeline=FakePetLogAgentPipeline(),
            pet_profile_reader=FakePetProfileReader(),
            speech_to_text=FakeSpeechToText(),
            community_repository=CommunityRepository(connection=connection),
            close=connection.close,
        )

        with TestClient(create_app(app_context=context)) as client:
            post_response = client.post(
                "/api/v1/community/posts",
                json={
                    "board": "유기동물",
                    "title": "새 글",
                    "body": "본문입니다.",
                    "tags": ["입양", "#임시보호"],
                    "locationLabel": "마포구 보호소 근처",
                },
            )
            post_id = post_response.json()["data"]["post"]["id"]
            comment_response = client.post(
                f"/api/v1/community/posts/{post_id}/comments",
                json={"body": "첫 댓글입니다."},
            )
            reaction_response = client.post(f"/api/v1/community/posts/{post_id}/reactions")

        self.assertEqual(post_response.status_code, 201)
        self.assertRegex(post_response.json()["data"]["post"]["authorName"], r"^[가-힣]+ [가-힣]+$")
        self.assertEqual(post_response.json()["data"]["post"]["feeds"], ["최신글"])
        self.assertEqual(post_response.json()["data"]["post"]["tags"], ["입양", "임시보호"])
        self.assertEqual(post_response.json()["data"]["post"]["locationLabel"], "마포구 보호소 근처")
        self.assertEqual(comment_response.status_code, 201)
        self.assertRegex(comment_response.json()["data"]["comment"]["authorName"], r"^[가-힣]+ [가-힣]+$")
        self.assertEqual(comment_response.json()["data"]["comment"]["body"], "첫 댓글입니다.")
        self.assertEqual(comment_response.json()["data"]["post"]["comments"], 1)
        self.assertEqual(reaction_response.status_code, 200)
        self.assertEqual(reaction_response.json()["data"]["post"]["likes"], 1)

    def test_record_route_converts_request_and_pipeline_result(self):
        context = FakeAppContext()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/pet-log/records",
                json={
                    "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                    "text": "오늘 아침 사료를 조금 남겼어",
                    "source": "manual",
                    "confirm": False,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(context.pet_log_agent_pipeline.handled_input.pet.id, "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3")
        self.assertEqual(context.pet_log_agent_pipeline.handled_input.pet.name, "초코")
        self.assertEqual(context.pet_log_agent_pipeline.handled_input.text, "오늘 아침 사료를 조금 남겼어")
        self.assertEqual(context.pet_log_agent_pipeline.handled_input.source, "manual")
        self.assertFalse(context.pet_log_agent_pipeline.handled_input.confirm)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "candidates": [
                        {
                            "title": "아침 식사",
                            "detail": "사료를 조금 남겼어요.",
                            "category": "meal",
                            "status": "notice",
                            "confidence": 0.82,
                            "needs_confirmation": True,
                            "measurements": ["사료 조금 남김"],
                        }
                    ],
                    "saved_records": [],
                    "needs_confirmation": True,
                    "safety_notices": [],
                    "suggestions": [],
                    "shopping_recommendations": [],
                    "reminders": [],
                },
            },
        )

    def test_shopping_recommendation_route_uses_pet_and_recent_records(self):
        context = FakeAppContext()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get(
                "/api/v1/shopping/recommendations",
                params={
                    "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                    "text": "사료를 조금 남겼어요",
                },
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()["data"]
        self.assertEqual(data["recommendations"][0]["title"], "반려견 사료")
        self.assertEqual(data["recommendations"][0]["lowest_price"], 12900)
        self.assertEqual(context.shopping_agent.handled_pet.name, "초코")
        self.assertEqual(context.shopping_agent.handled_text, "사료를 조금 남겼어요")
        self.assertEqual(context.shopping_agent.handled_records[0].id, "record-1")
        self.assertEqual(context.shopping_agent.handled_suggestions[0].title, "식사 관리")

    def test_record_route_logs_pipeline_result_summary(self):
        context = FakeAppContext()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            with self.assertLogs("presentation.http.pet_log_routes", level="INFO") as logs:
                response = client.post(
                    "/api/v1/pet-log/records",
                    json={
                        "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                        "text": "오늘 아침 사료를 조금 남겼어",
                        "source": "ai_preview",
                        "confirm": False,
                    },
                )

        self.assertEqual(response.status_code, 200)
        log_output = "\n".join(logs.output)
        self.assertIn("record.result", log_output)
        self.assertIn("pet_id=pet_01JCM7V8H9Q2K4N6R8T0A1B2C3", log_output)
        self.assertIn("source=ai_preview", log_output)
        self.assertIn("mode=preview", log_output)
        self.assertIn("confirm=no", log_output)
        self.assertIn("candidates=1", log_output)
        self.assertIn("saved=0", log_output)
        self.assertIn('first="meal: 아침 식사"', log_output)

    def test_record_route_rejects_blank_text(self):
        client = TestClient(create_app(app_context_factory=FakeAppContext))

        response = client.post(
            "/api/v1/pet-log/records",
            json={
                "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                "text": "   ",
                "source": "manual",
            },
        )

        self.assertEqual(response.status_code, 422)

    def test_record_route_returns_404_for_unknown_pet_id(self):
        with TestClient(create_app(app_context_factory=FakeAppContext)) as client:
            response = client.post(
                "/api/v1/pet-log/records",
                json={
                    "pet_id": "missing-pet",
                    "text": "오늘 아침 사료를 조금 남겼어",
                    "source": "manual",
                },
            )

        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json(), {"detail": "Pet not found"})

    def test_pet_log_router_can_be_composed_independently(self):
        from fastapi import FastAPI

        from presentation.http.pet_log_routes import build_pet_log_router

        context = FakeAppContext()
        app = FastAPI()
        app.state.app_context = context
        app.include_router(build_pet_log_router())

        with TestClient(app) as client:
            response = client.post(
                "/api/v1/pet-log/records",
                json={
                    "pet_id": "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
                    "text": "오늘 아침 사료를 조금 남겼어",
                    "source": "manual",
                    "confirm": False,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(context.pet_log_agent_pipeline.handled_input.pet.id, "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3")

    def test_lifespan_closes_app_context_on_shutdown(self):
        context = FakeAppContext()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertTrue(context.closed)

    def test_create_app_accepts_prebuilt_context(self):
        context = AppContext(
            pet_log_agent_pipeline=FakePetLogAgentPipeline(),
            pet_profile_reader=FakePetProfileReader(),
            speech_to_text=FakeSpeechToText(),
        )

        with TestClient(create_app(app_context=context)) as client:
            response = client.get("/health")

        self.assertEqual(response.status_code, 200)

    def test_speech_transcription_route_accepts_audio_file(self):
        context = FakeAppContext()
        context.speech_text_corrector = FakeSpeechTextCorrector()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/speech/transcriptions",
                files={"audio": ("recording.webm", b"audio-bytes", "audio/webm")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(context.speech_to_text.transcribed_audio, b"audio-bytes")
        self.assertEqual(context.speech_to_text.transcribed_content_type, "audio/webm")
        self.assertEqual(context.speech_text_corrector.handled_text, "오늘 아침 사료를 조금 남겼어")
        self.assertEqual(context.speech_text_corrector.handled_pet_names, ("초코",))
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "text": "오늘 아침 사료를 조금 남겼어",
                    "corrected_text": "오늘 아침 사료를 조금 남겼어요.",
                },
            },
        )

    def test_speech_transcription_route_falls_back_to_raw_text_when_correction_fails(self):
        context = FakeAppContext()
        context.speech_text_corrector = FailingSpeechTextCorrector()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/speech/transcriptions",
                files={"audio": ("recording.webm", b"audio-bytes", "audio/webm")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "text": "오늘 아침 사료를 조금 남겼어",
                    "corrected_text": "오늘 아침 사료를 조금 남겼어",
                },
            },
        )

    def test_speech_text_correction_route_returns_corrected_text(self):
        context = FakeAppContext()
        context.speech_text_corrector = FakeSpeechTextCorrector()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/speech/text-corrections",
                json={"text": "오늘 아침 사료를 조금 남겼어"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(context.speech_text_corrector.handled_text, "오늘 아침 사료를 조금 남겼어")
        self.assertEqual(context.speech_text_corrector.handled_pet_names, ("초코",))
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "text": "오늘 아침 사료를 조금 남겼어",
                    "corrected_text": "오늘 아침 사료를 조금 남겼어요.",
                },
            },
        )

    def test_speech_router_can_be_composed_independently(self):
        from fastapi import FastAPI

        from presentation.http.speech_routes import build_speech_router

        context = FakeAppContext()
        app = FastAPI()
        app.state.app_context = context
        app.include_router(build_speech_router())

        with TestClient(app) as client:
            response = client.post(
                "/api/v1/speech/transcriptions",
                files={"audio": ("recording.webm", b"audio-bytes", "audio/webm")},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(context.speech_to_text.transcribed_audio, b"audio-bytes")

    def test_speech_transcription_route_rejects_empty_audio_file(self):
        with TestClient(create_app(app_context_factory=FakeAppContext)) as client:
            response = client.post(
                "/api/v1/speech/transcriptions",
                files={"audio": ("empty.webm", b"", "audio/webm")},
            )

        self.assertEqual(response.status_code, 422)

    def test_speech_transcription_route_rejects_non_audio_content_type(self):
        with TestClient(create_app(app_context_factory=FakeAppContext)) as client:
            response = client.post(
                "/api/v1/speech/transcriptions",
                files={"audio": ("notes.txt", b"not audio", "text/plain")},
            )

        self.assertEqual(response.status_code, 415)

    def test_speech_synthesis_route_returns_mpeg_audio(self):
        context = FakeAppContext()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/speech/synthesis",
                json={"text": "주의 기록 후속 확인이 필요합니다.", "voice": "ko-KR-InJoonNeural"},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers["content-type"], "audio/mpeg")
        self.assertEqual(response.content, "ko-KR-InJoonNeural:주의 기록 후속 확인이 필요합니다.".encode("utf-8"))
        self.assertEqual(context.text_to_speech.synthesized_text, "주의 기록 후속 확인이 필요합니다.")
        self.assertEqual(context.text_to_speech.synthesized_voice, "ko-KR-InJoonNeural")

    def test_speech_synthesis_route_runs_provider_outside_event_loop(self):
        context = FakeAppContext()
        context.text_to_speech = AsyncioRunTextToSpeech()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/speech/synthesis",
                json={"text": "알림을 읽어주세요."},
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.content, "default:알림을 읽어주세요.".encode("utf-8"))

    def test_speech_synthesis_route_rejects_empty_text(self):
        with TestClient(create_app(app_context_factory=FakeAppContext)) as client:
            response = client.post("/api/v1/speech/synthesis", json={"text": "   "})

        self.assertEqual(response.status_code, 422)

    def test_file_upload_route_saves_profile_photo_and_serves_it(self):
        with tempfile.TemporaryDirectory() as directory:
            connection = connect(":memory:")
            connection.execute(
                "INSERT INTO pets (id, name, notes) VALUES (?, ?, ?)",
                (SAMPLE_PET_ID, "꾸꾸", "[]"),
            )
            connection.commit()
            context = AppContext(
                pet_log_agent_pipeline=FakePetLogAgentPipeline(),
                pet_profile_reader=PetProfileRepository(connection=connection),
                speech_to_text=FakeSpeechToText(),
                file_repository=FileRepository(connection=connection),
                file_storage=LocalFileStorage(Path(directory)),
                close=connection.close,
            )

            with TestClient(create_app(app_context=context)) as client:
                response = client.post(
                    "/api/v1/files",
                    data={"pet_id": SAMPLE_PET_ID, "purpose": "profile_photo"},
                    files={"file": ("kukku.jpg", b"image-bytes", "image/jpeg")},
                )

                self.assertEqual(response.status_code, 201)
                payload = response.json()
                file_data = payload["data"]["file"]
                self.assertEqual(file_data["pet_id"], SAMPLE_PET_ID)
                self.assertEqual(file_data["purpose"], "profile_photo")
                self.assertEqual(file_data["mime_type"], "image/jpeg")
                self.assertEqual(file_data["byte_size"], len(b"image-bytes"))
                self.assertEqual(file_data["url"], f"/api/v1/files/{file_data['id']}")

                linked_pet = connection.execute(
                    "SELECT photo_file_id FROM pets WHERE id = ?",
                    (SAMPLE_PET_ID,),
                ).fetchone()
                self.assertEqual(linked_pet["photo_file_id"], file_data["id"])

                image_response = client.get(file_data["url"])

            self.assertEqual(image_response.status_code, 200)
            self.assertEqual(image_response.content, b"image-bytes")
            self.assertEqual(image_response.headers["content-type"], "image/jpeg")

    def test_file_upload_route_rejects_non_image_file(self):
        with tempfile.TemporaryDirectory() as directory:
            connection = connect(":memory:")
            context = AppContext(
                pet_log_agent_pipeline=FakePetLogAgentPipeline(),
                pet_profile_reader=PetProfileRepository(connection=connection),
                speech_to_text=FakeSpeechToText(),
                file_repository=FileRepository(connection=connection),
                file_storage=LocalFileStorage(Path(directory)),
                close=connection.close,
            )

            with TestClient(create_app(app_context=context)) as client:
                response = client.post(
                    "/api/v1/files",
                    data={"pet_id": SAMPLE_PET_ID, "purpose": "profile_photo"},
                    files={"file": ("notes.txt", b"not-image", "text/plain")},
                )

        self.assertEqual(response.status_code, 415)

    def test_hospital_recommendation_route_converts_request_and_result(self):
        context = FakeAppContext()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/hospitals/recommendations",
                json={
                    "latitude": 37.5,
                    "longitude": 127.0,
                    "accuracy_meters": 25,
                    "location_source": "gps",
                    "radius_meters": 1500,
                    "max_results": 3,
                    "open_now_only": True,
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(context.hospital_recommendation_agent.handled_query.latitude, 37.5)
        self.assertEqual(context.hospital_recommendation_agent.handled_query.longitude, 127.0)
        self.assertEqual(context.hospital_recommendation_agent.handled_query.accuracy_meters, 25)
        self.assertEqual(context.hospital_recommendation_agent.handled_query.location_source, "gps")
        self.assertEqual(context.hospital_recommendation_agent.handled_query.radius_meters, 1500)
        self.assertEqual(
            response.json(),
            {
                "success": True,
                "data": {
                    "current_time": "2026-05-11T15:30:00+09:00",
                    "search_center": {
                        "latitude": 37.5,
                        "longitude": 127.0,
                        "radius_meters": 1500,
                        "location_source": "gps",
                        "accuracy_meters": 25.0,
                        "emergency_mode": False,
                    },
                    "recommendations": [
                        {
                            "place_id": "hospital-1",
                            "name": "24시 반려동물병원",
                            "address": "서울시 강남구",
                            "phone_number": "02-1234-5678",
                            "google_maps_url": "https://maps.google.com/?cid=1",
                            "latitude": 37.501,
                            "longitude": 127.001,
                            "rating": 4.6,
                            "user_rating_count": 42,
                            "is_open_now": True,
                            "is_24_hours": True,
                            "weekday_text": ["월요일: 24시간"],
                            "distance_meters": 130,
                            "reason": "24시간 영업으로 확인되어 현재 시각 기준 우선 추천합니다.",
                        }
                    ],
                },
            },
        )

    def test_hospital_recommendation_route_returns_503_without_google_maps_key(self):
        context = FakeAppContext()
        context.hospital_recommendation_agent = MissingGoogleMapsKeyHospitalAgent()

        with TestClient(create_app(app_context_factory=lambda: context)) as client:
            response = client.post(
                "/api/v1/hospitals/recommendations",
                json={"latitude": 37.5, "longitude": 127.0},
            )

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"detail": "Google Maps API key is not configured"})


if __name__ == "__main__":
    unittest.main()

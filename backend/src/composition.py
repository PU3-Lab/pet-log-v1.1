from __future__ import annotations

from collections.abc import Callable
from dataclasses import dataclass, field

from application.agents.care_context import CareContextBuilder
from application.agents.care_action_navigation import CareActionRoutingAgent
from application.agents.context_analysis import ContextAnalysisAgent
from application.agents.hospital import HospitalRecommendationAgent
from application.agents.pet_persona import PetPersonaAgent
from application.agents.record_structuring import RecordStructuringAgent
from application.agents.reminder import ReminderAgent
from application.agents.risk_detection import RiskDetectionAgent
from application.agents.shopping import ShoppingAgent, ShoppingRecommendationAgent
from application.agents.suggestion import SuggestionAgent
from application.pipelines.care_question import CareQuestionPipeline
from application.pipelines.pet_chat import PetChatPipeline
from application.pipelines.pet_log_graph import LangGraphPetLogAgentPipeline
from agent_runtime.tool_registry import PetLogToolDependencies, build_pet_log_node_wiring
from infrastructure.database import connect
from infrastructure.knowledge import CareKnowledgeRetriever
from infrastructure.llm.action_navigation import ActionNavigationProvider
from infrastructure.llm.care_answer import CareAnswerProvider
from infrastructure.llm.preload import preload_configured_llm_providers
from infrastructure.llm.pet_persona import PetPersonaResponder
from infrastructure.llm.record_structuring import RecordStructurer
from infrastructure.llm.shopping_reason import ShoppingReasonProvider
from infrastructure.maps import GooglePlacesClient
from infrastructure.policies.missing_record_policy import MissingRecordPolicy
from infrastructure.policies.pattern_analyzer import PatternAnalyzer
from infrastructure.policies.reminder_planner import ReminderPlanner
from infrastructure.policies.risk_signal_policy import RiskSignalPolicy
from infrastructure.policies.suggestion_composer import SuggestionComposer
from infrastructure.notifications.policy import NotificationPolicy
from infrastructure.repositories.community_repository import CommunityRepository
from infrastructure.repositories.file_repository import FileRepository, LocalFileStorage
from infrastructure.repositories.notification_repository import NotificationRepository
from infrastructure.repositories.pet_profile_repository import PetProfileRepository
from infrastructure.repositories.record_repository import RecordRepository
from infrastructure.repositories.schedule_repository import ScheduleRepository
from infrastructure.shopping import NaverShoppingClient, ShoppingRecommendationProvider
from infrastructure.speech import SpeechToTextProvider, TextToSpeechProvider
from infrastructure.speech.speech_text_correction import SpeechTextCorrectionProvider
from middleware import HospitalCacheRateLimitMiddleware, HospitalFallbackMiddleware, ShoppingFallbackMiddleware


@dataclass(frozen=True)
class AppContext:
    pet_log_agent_pipeline: LangGraphPetLogAgentPipeline
    pet_profile_reader: PetProfileRepository
    speech_to_text: SpeechToTextProvider
    speech_text_corrector: SpeechTextCorrectionProvider | None = None
    text_to_speech: TextToSpeechProvider | None = None
    care_question_pipeline: CareQuestionPipeline | None = None
    pet_chat_pipeline: PetChatPipeline | None = None
    risk_detection_agent: RiskDetectionAgent | None = None
    context_analysis_agent: ContextAnalysisAgent | None = None
    suggestion_agent: SuggestionAgent | None = None
    shopping_agent: ShoppingAgent | None = None
    hospital_recommendation_agent: HospitalRecommendationAgent | None = None
    record_reader: RecordRepository | None = None
    schedule_reader: ScheduleRepository | None = None
    file_repository: FileRepository | None = None
    file_storage: LocalFileStorage | None = None
    notification_repository: NotificationRepository | None = None
    notification_policy: NotificationPolicy | None = None
    community_repository: CommunityRepository | None = None
    close: Callable[[], None] = field(default=lambda: None)


def build_app_context(database_path: str | None = None) -> AppContext:
    preload_configured_llm_providers()
    database = connect(database_path)
    record_repository = RecordRepository(connection=database)
    schedule_repository = ScheduleRepository(connection=database)
    pet_profile_reader = PetProfileRepository(connection=database)
    file_repository = FileRepository(connection=database)
    notification_repository = NotificationRepository(connection=database)
    community_repository = CommunityRepository(connection=database)

    risk_detection_agent = RiskDetectionAgent(RiskSignalPolicy())
    context_analysis_agent = ContextAnalysisAgent(
        PatternAnalyzer(),
        MissingRecordPolicy(),
        action_routing_agent=CareActionRoutingAgent(ActionNavigationProvider()),
    )
    suggestion_agent = SuggestionAgent(SuggestionComposer())
    care_context_builder = CareContextBuilder(
        pet_profile_reader=pet_profile_reader,
        record_history_reader=record_repository,
        schedule_context_reader=schedule_repository,
        days_ahead=14,
    )
    care_question_pipeline = CareQuestionPipeline(
        context_builder=care_context_builder,
        safety_guard=_NoopSafetyGuard(),
        answer_provider=CareAnswerProvider(knowledge_retriever=CareKnowledgeRetriever()),
        lookback_days=30,
    )
    pet_chat_pipeline = PetChatPipeline(
        context_builder=care_context_builder,
        safety_guard=_NoopSafetyGuard(),
        pet_persona_agent=PetPersonaAgent(PetPersonaResponder()),
        lookback_days=30,
    )

    shopping_agent = ShoppingAgent(
        ShoppingFallbackMiddleware(ShoppingRecommendationProvider(NaverShoppingClient())),
        recommendation_agent=ShoppingRecommendationAgent(ShoppingReasonProvider()),
    )
    pipeline = LangGraphPetLogAgentPipeline(
        record_structuring_agent=RecordStructuringAgent(_record_structurer()),
        record_history_reader=record_repository,
        schedule_context_reader=schedule_repository,
        context_analysis_agent=context_analysis_agent,
        risk_detection_agent=risk_detection_agent,
        record_repository=record_repository,
        suggestion_agent=suggestion_agent,
        reminder_agent=ReminderAgent(ReminderPlanner()),
        shopping_agent=shopping_agent,
        node_wiring=build_pet_log_node_wiring(
            PetLogToolDependencies(
                profile_repository=pet_profile_reader,
                record_repository=record_repository,
            )
        ),
    )
    return AppContext(
        pet_log_agent_pipeline=pipeline,
        pet_profile_reader=pet_profile_reader,
        speech_to_text=SpeechToTextProvider(),
        speech_text_corrector=SpeechTextCorrectionProvider(),
        text_to_speech=TextToSpeechProvider(),
        care_question_pipeline=care_question_pipeline,
        pet_chat_pipeline=pet_chat_pipeline,
        risk_detection_agent=risk_detection_agent,
        context_analysis_agent=context_analysis_agent,
        suggestion_agent=suggestion_agent,
        shopping_agent=shopping_agent,
        hospital_recommendation_agent=HospitalRecommendationAgent(
            HospitalFallbackMiddleware(HospitalCacheRateLimitMiddleware(GooglePlacesClient()))
        ),
        record_reader=record_repository,
        schedule_reader=schedule_repository,
        file_repository=file_repository,
        file_storage=LocalFileStorage(),
        notification_repository=notification_repository,
        notification_policy=NotificationPolicy(),
        community_repository=community_repository,
        close=database.close,
    )


def build_pet_log_agent_pipeline(database_path: str | None = None) -> LangGraphPetLogAgentPipeline:
    preload_configured_llm_providers()
    database = connect(database_path)
    record_repository = RecordRepository(connection=database)
    schedule_repository = ScheduleRepository(connection=database)
    pet_profile_reader = PetProfileRepository(connection=database)
    return LangGraphPetLogAgentPipeline(
        record_structuring_agent=RecordStructuringAgent(_record_structurer()),
        record_history_reader=record_repository,
        schedule_context_reader=schedule_repository,
        context_analysis_agent=ContextAnalysisAgent(
            PatternAnalyzer(),
            MissingRecordPolicy(),
            action_routing_agent=CareActionRoutingAgent(ActionNavigationProvider()),
        ),
        risk_detection_agent=RiskDetectionAgent(RiskSignalPolicy()),
        record_repository=record_repository,
        suggestion_agent=SuggestionAgent(SuggestionComposer()),
        reminder_agent=ReminderAgent(ReminderPlanner()),
        shopping_agent=ShoppingAgent(
            ShoppingFallbackMiddleware(ShoppingRecommendationProvider(NaverShoppingClient())),
            recommendation_agent=ShoppingRecommendationAgent(ShoppingReasonProvider()),
        ),
        node_wiring=build_pet_log_node_wiring(
            PetLogToolDependencies(
                profile_repository=pet_profile_reader,
                record_repository=record_repository,
            )
        ),
    )


def build_pet_profile_reader(database_path: str | None = None) -> PetProfileRepository:
    database = connect(database_path)
    return PetProfileRepository(connection=database)


def _record_structurer():
    return RecordStructurer()


class _NoopSafetyGuard:
    def check(self, text: str):
        return None

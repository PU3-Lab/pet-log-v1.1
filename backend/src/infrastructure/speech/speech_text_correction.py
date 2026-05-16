from __future__ import annotations

from infrastructure.llm.base_provider import BaseLLMProvider
from infrastructure.llm.care_answer.mapper import message_content_to_text
from infrastructure.llm.constants import DEFAULT_SPEECH_TEXT_CORRECTION_MODEL
from infrastructure.llm.model_factory import LLMModel, ModelFactory, build_chat_model
from infrastructure.llm.provider_config import LLMProviderConfig


MAX_CORRECTED_SPEECH_TEXT_LENGTH = 500


class SpeechTextCorrectionProvider(BaseLLMProvider[LLMModel]):
    def __init__(
        self,
        *,
        api_key: str | None = None,
        model: str | None = None,
        timeout: float = 20.0,
        model_factory: ModelFactory[LLMModel] = build_chat_model,
        chat_model: LLMModel | None = None,
    ) -> None:
        super().__init__(
            config=LLMProviderConfig.from_env(
                provider_name="SpeechTextCorrectionProvider",
                model_env="OPENAI_SPEECH_TEXT_CORRECTION_MODEL",
                default_model=DEFAULT_SPEECH_TEXT_CORRECTION_MODEL,
                fallback_model_env="OPENAI_SPEECH_TEXT_CORRECTION_FALLBACK_MODEL",
                api_key=api_key,
                model=model,
                timeout=timeout,
            ),
            model_factory=model_factory,
            model=chat_model,
        )

    def correct(self, text: str, pet_names: tuple[str, ...] = ()) -> str:
        normalized = text.strip()
        if not normalized:
            return ""

        result = self._invoke_llm(build_speech_text_correction_messages(normalized, pet_names))
        corrected = message_content_to_text(result).strip().strip('"').strip()
        if not corrected:
            return normalized
        return corrected[:MAX_CORRECTED_SPEECH_TEXT_LENGTH]


def build_speech_text_correction_messages(text: str, pet_names: tuple[str, ...] = ()) -> list[tuple[str, str]]:
    normalized_names = tuple(name.strip() for name in pet_names if name.strip())
    user_lines = []
    if normalized_names:
        user_lines.append(f"registered_pet_names: {', '.join(normalized_names)}")
    user_lines.append(f"stt_text: {text}")
    return [
        ("system", speech_text_correction_system_prompt()),
        ("user", "\n".join(user_lines)),
    ]


def speech_text_correction_system_prompt() -> str:
    return (
        "보호자가 음성으로 입력한 반려동물 케어 기록 문장을 한국어로 바로잡으세요. "
        "띄어쓰기, 문장부호, 명백한 STT 오인식 단어만 고치고 자연스러운 구어체 기록 문장으로 만드세요. "
        "등록된 프로필 이름 목록이 제공되면, 원문 안의 비슷하게 들리는 반려동물 이름 오인식을 정확한 프로필 이름으로 고치세요. "
        "원문에 없는 수치, 시간, 증상, 행동, 진단, 원인을 추가하지 마세요. "
        "프로필 목록에 없는 새 이름을 만들지 마세요. "
        "의미가 불확실하면 원문 의미를 보존하세요. "
        "설명 없이 교정된 문장만 500자 이내로 반환하세요."
    )

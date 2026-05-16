# Infrastructure Skeleton

현재 구현체는 제품 경로에서 직접 호출되는 concrete class를 둔다. 과거처럼 `application.interfaces`의 `Protocol`을 먼저 만들지 않고, 실제 교체 필요가 확인될 때만 최소 interface를 도입한다.

## Skeleton 위치

| 파일 | 클래스 | 계약 표면 | 현재 상태 |
| --- | --- | --- | --- |
| `src/infrastructure/llm/record_structuring/provider.py` | `RecordStructurer` | concrete class | LangChain structured output 구현 |
| `src/infrastructure/llm/care_answer/provider.py` | `CareAnswerProvider` | concrete class | OpenAI 답변 provider |
| `src/infrastructure/llm/pet_persona/provider.py` | `PetPersonaResponder` | concrete class | OpenAI 펫 말투 provider |
| `src/infrastructure/speech/speech_to_text.py` | `SpeechToTextProvider` | concrete class | Whisper medium 구현 |
| `src/infrastructure/speech/text_to_speech.py` | `TextToSpeechProvider` | concrete class | edge-tts 구현 |
| `src/infrastructure/policies/pattern_analyzer.py` | `PatternAnalyzer` | concrete class | rule-based 분석 |
| `src/infrastructure/policies/missing_record_policy.py` | `MissingRecordPolicy` | concrete class | rule-based 누락 감지 |
| `src/infrastructure/policies/risk_signal_policy.py` | `RiskSignalPolicy` | concrete class | rule-based 위험 신호 |
| `src/infrastructure/policies/suggestion_composer.py` | `SuggestionComposer` | concrete class | rule-based 제안 |
| `src/infrastructure/policies/reminder_planner.py` | `ReminderPlanner` | concrete class | rule-based 리마인더 |
| `src/infrastructure/repositories/pet_profile_repository.py` | `PetProfileRepository` | concrete class | SQLite/in-memory profile 조회 |
| `src/infrastructure/repositories/record_repository.py` | `RecordRepository` | concrete class | SQLite/in-memory 기록 저장/조회 |
| `src/infrastructure/repositories/schedule_repository.py` | `ScheduleRepository` | concrete class | SQLite/in-memory 일정 조회 |
| `src/infrastructure/repositories/pet_log_agent_result_repository.py` | `PetLogAgentResultRepository` | concrete class | agent 결과 조회 |
| `src/infrastructure/composers/home_feed_composer.py` | `HomeFeedComposer` | concrete class | 홈 카드 조립 |
| `src/infrastructure/composers/hospital_report_composer.py` | `HospitalReportComposer` | concrete class | 병원 제출 요약 조립 |

## 후속 구현 후보

| 후보 | 기준 class | 목적 |
| --- | --- | --- |
| `FakeRecordStructurer` | `RecordStructurer` 호출 계약 | 네트워크 없는 구조화 테스트 |
| `PetProfileRepository` | repository class | 테스트/로컬 demo 또는 실제 DB profile 조회 |
| `RecordRepository` | repository class | 기록 저장/조회 |
| `RuleBased*` policy 구현체 | concrete policy class | 식사/산책/배변/행동 패턴, 위험 신호, 기록 누락, 리마인더 |
| `LLM*` provider 구현체 | concrete provider class | 케어 질문, 펫 대화, 병원 요약 생성 |
| `Speech*` provider 구현체 | concrete speech provider class | 음성 입력 STT, 음성 응답 TTS |

## 결정 보류

- 실제 DB row와 domain model 매핑은 repository 구현체 설계 시 확정한다.
- `PetChatPipeline`의 말투 규칙은 프로필의 `personality`, 최근 기록, 안전 규칙을 기반으로 별도 prompt/spec 문서에서 정한다.
- `CareQuestionPipeline`과 `PetChatPipeline`을 같은 LLM provider로 구현하더라도 class 책임은 분리한다.
- 실제 AI provider 도입 시 sync/async 전환을 재검토한다. 현재 호출 계약은 단순성을 위해 sync 기준이다.
- 커뮤니티, 쇼핑, 공동 관리의 전체 기능은 core care pipeline 밖으로 두고, 추천/병원/상품 연계가 필요할 때 별도 bounded context로 분리한다.

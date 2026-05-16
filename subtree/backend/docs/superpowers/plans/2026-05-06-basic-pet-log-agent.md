# 펫로그 기본 에이전트 구현 계획

> **에이전트 작업자 필수 지침:** 이 계획을 실행할 때는 `superpowers:subagent-driven-development` 권장, 또는 `superpowers:executing-plans`를 사용한다. 단계 추적은 체크박스(`- [ ]`)로 한다.

**목표:** 자연어 기록 입력을 구조화하고, 최근 맥락을 분석한 뒤, 보호자에게 케어 제안을 반환하는 backend LLM agent 파이프라인의 패키지 구조와 인터페이스 뼈대를 만든다.

**아키텍처:** 첫 버전은 웹 프레임워크, DB, 유료 AI 의존성 없이 순수 Python domain/application pipeline으로 구성한다. `agent`는 제품 기능을 맡는 LLM agent 단위로 유지하고, 실행 공통층은 `agent_runtime`, 전후처리는 `middleware`, 호출 가능 기능은 `tools`, 외부 구현은 `infrastructure`, 진입점은 `presentation`에 둔다. 내부 구현은 만들지 않고, `Protocol` 인터페이스와 이를 상속받는 구현 클래스 skeleton만 둔다.

**기술 스택:** Python 3.12, 표준 라이브러리 `dataclasses`, `typing.Protocol`, `setuptools` `src` layout.

**우선 설계 문서:** `docs/superpowers/designs/pet-log-pipeline-interface-design.md`

**현재 실행 기준:** 예전 `pet_log_agent/` 초안은 폐기하고, `src/` 아래 최상위 패키지(`domain`, `application`, `agent_runtime`, `middleware`, `tools`, `infrastructure`, `presentation`, `composition`)를 기준으로 진행한다.

---

## 범위

이 계획은 기본 에이전트 코어의 구조와 인터페이스만 구성한다.

포함:
- OOP 에이전트 파이프라인
- 구조화된 기록 후보 DTO/type
- 누적 맥락, 위험 신호, 제안, 리마인더 interface
- agent/pipeline 함수 호출 구성
- agent runtime, middleware, tools skeleton
- infrastructure 구현 클래스 skeleton
- package import 검증

이번 단계에서 제외:
- FastAPI 또는 HTTP endpoint
- 실제 DB 저장
- OpenAI 또는 로컬 모델 연동
- Mock AI provider 내부 로직
- rule-based 분석/추천/리마인더 내부 로직
- agent runtime loop 내부 로직
- tool execution 내부 로직
- 인증
- frontend 연동
- Notion 문서 동기화

## 파일 구조

- 생성: `src/domain/enums.py`
  - category, status, input source, severity literal.
- 생성: `src/domain/models.py`
  - 에이전트가 사용하는 dataclass 도메인 타입.
- 생성: `src/application/dto.py`
  - pipeline input/output DTO.
- 생성: `src/application/interfaces/`
  - pipeline, agent, repository, LLM, policy, composer protocol.
- 생성: `src/application/agents/*.py`
  - 제품 기능을 맡는 LLM agent skeleton.
- 생성: `src/application/pipelines/*.py`
  - core/surface pipeline orchestration shell.
- 생성: `src/agent_runtime/*.py`
  - LLM 실행 loop, prompt 조립, tool registry, memory skeleton.
- 생성: `src/middleware/*.py`
  - safety, logging, tracing, retry, validation skeleton.
- 생성: `src/tools/*.py`
  - agent가 호출 가능한 record/profile/schedule/care tool skeleton.
- 생성: `src/infrastructure/{llm,policies,repositories,composers}/*.py`
  - 인터페이스를 상속받는 구현 클래스 skeleton.
- 생성: `src/presentation/{http,cli}/__init__.py`
  - HTTP/CLI entrypoint 후보 폴더.
- 수정: `pyproject.toml`
  - `src` layout package 설정.
- 후속: `src/composition.py`
  - concrete adapter wiring 함수 skeleton.

## 성공 기준

- `uv run python -B -c "...import..."`로 package import가 통과한다.
- 외부 interface마다 이를 상속받는 구현 클래스 skeleton이 있다.
- `agent_runtime`, `middleware`, `tools`는 내부 로직 없이 import 가능한 skeleton만 가진다.
- 내부 구현 method는 `raise NotImplementedError` 상태다.
- `src/composition.py`는 후속 단계에서 pipeline 조립 entry skeleton만 가진다.
- 네트워크 또는 유료 AI 서비스가 필요 없다.

## 설계 검토 반영 사항

- 테스트 runner는 표준 라이브러리 `unittest`로 유지한다.
- 모든 테스트 예시는 일반 `def test_*` 함수가 아니라 `unittest.TestCase` method로 작성한다.
- `PetProfile.species`는 현재 `db_schema.PetRow`에 직접 대응 필드가 없으므로 optional field로 둔다.
- 실제 DB infrastructure 구현체를 만들 때 `species`, `breed`, pet type 매핑을 별도 설계한다.
- 구현 task는 `pet_log_agent/` 초안보다 `src/` pipeline interface 설계를 우선 기준으로 재정렬한다.

---

## 작업용 에이전트 구성

구현은 `superpowers:subagent-driven-development` 방식으로 진행한다. 모든 task가 같은 package와 공통 test file을 건드리므로 구현 worker를 병렬로 돌리지 않는다.

에이전트별 상세 지침은 별도 파일로 분리한다.

- Controller Agent: `docs/superpowers/agents/controller-agent.md`
- Architect Agent: `docs/superpowers/agents/architect-agent.md`
- Task Implementer Agent: `docs/superpowers/agents/task-implementer-agent.md`
- Spec Reviewer Agent: `docs/superpowers/agents/spec-reviewer-agent.md`
- Code Quality Reviewer Agent: `docs/superpowers/agents/code-quality-reviewer-agent.md`
- Final Reviewer Agent: `docs/superpowers/agents/final-reviewer-agent.md`

실행 순서:

```text
Controller Agent
  -> Architect Agent
  -> Task Implementer Agent
  -> Spec Reviewer Agent
  -> Code Quality Reviewer Agent
  -> 다음 task 반복
  -> Final Reviewer Agent
```

### 런타임 제품 에이전트 구조

backend code는 product-facing core pipeline 하나와 surface pipeline들, 그리고 LLM agent 실행 공통층을 노출한다.

```text
PetLogAgentPipeline
  -> RecordStructuringAgent
  -> ContextAnalysisAgent
  -> RiskDetectionAgent
  -> SuggestionAgent
  -> ReminderAgent

Surface Pipelines
  -> HomeFeedPipeline
  -> CareQuestionPipeline
  -> PetChatPipeline
  -> HospitalSummaryPipeline

Agent Runtime
  -> AgentRuntime
  -> ToolRegistry
  -> Middleware chain
  -> Tools
```

이 구조는 OOP를 유지하면서, 제품상 독립 specialist agent와 LLM tool calling을 수용한다. 다만 multi-agent planner, handoff protocol, 장기 memory는 후속 단계로 둔다.

---

## 현재 task 기준

아래 `Task 1` 이후의 세부 TDD task는 초기 `pet_log_agent/` 초안에서 온 historical draft다. 현재 실행은 `docs/superpowers/designs/pet-log-pipeline-interface-design.md`와 `src/` 패키지 구조를 우선한다.

현재 완료된 범위:

- `src/domain`, `src/application`, `src/infrastructure`, `src/presentation` 패키지 구조 생성
- `src/agent_runtime`, `src/middleware`, `src/tools` skeleton 생성
- domain/application DTO와 interface 생성
- agent/pipeline 함수 호출 구성 생성
- infrastructure 구현 클래스 skeleton 생성
- `pyproject.toml`의 `src` layout package 설정
- target package structure import 검증

완료된 rename/migration:

- `src/application/ports.py` -> `src/application/interfaces/`
- `src/adapters/inbound/*` -> `src/presentation/*`
- `src/adapters/outbound/ai/*` -> `src/infrastructure/llm/*`
- `src/adapters/outbound/*` -> `src/infrastructure/*`
- 신규 `src/agent_runtime/*`, `src/middleware/*`, `src/tools/*` 추가
- `src/composition.py`에 pipeline 조립 entry function skeleton 추가

다음 승인 대기 범위:

- 실제 DB/LLM/rule 구현체 중 다음 우선순위 선택

---

## Task 1: Domain Model

**파일:**
- 생성: `pet_log_agent/domain.py`
- 테스트: `tests/test_pet_log_agent.py`

- [ ] **Step 1: failing test 작성**

```python
import unittest

from pet_log_agent.domain import PetProfile, RecordInput


class TestDomainModel(unittest.TestCase):
    def test_record_input_keeps_user_text_and_pet_profile(self):
        pet = PetProfile(name="초코", species="dog", age_label="10개월", personality="겁이 많음")
        record_input = RecordInput(
            pet=pet,
            text="오늘 밥을 조금 먹고 산책은 못 했어",
            source="manual",
        )

        self.assertEqual(record_input.pet.name, "초코")
        self.assertEqual(record_input.text, "오늘 밥을 조금 먹고 산책은 못 했어")
        self.assertEqual(record_input.source, "manual")
```

- [ ] **Step 2: 테스트 실패 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: `pet_log_agent`가 없어서 FAIL.

- [ ] **Step 3: 최소 구현 작성**

`pet_log_agent/domain.py` 생성:

```python
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

from db_schema import RecordCategory, RecordInputSource, RecordStatus


@dataclass(frozen=True)
class PetProfile:
    name: str
    species: str | None = None
    age_label: str | None = None
    personality: str | None = None
    notes: tuple[str, ...] = ()


@dataclass(frozen=True)
class RecordInput:
    pet: PetProfile
    text: str
    source: RecordInputSource = "manual"


@dataclass(frozen=True)
class StructuredRecordCandidate:
    title: str
    detail: str
    category: RecordCategory
    status: RecordStatus
    confidence: float
    measurements: tuple[str, ...] = ()


InsightSeverity = Literal["info", "notice", "alert"]


@dataclass(frozen=True)
class CareInsight:
    severity: InsightSeverity
    title: str
    reason: str


@dataclass(frozen=True)
class CareSuggestion:
    title: str
    action: str


@dataclass(frozen=True)
class AgentResult:
    candidate: StructuredRecordCandidate
    insights: tuple[CareInsight, ...] = field(default_factory=tuple)
    suggestions: tuple[CareSuggestion, ...] = field(default_factory=tuple)
    response_text: str = ""
```

- [ ] **Step 4: 테스트 통과 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: PASS.

---

## Task 2: Mock Provider

**파일:**
- 생성: `pet_log_agent/providers.py`
- 수정: `tests/test_pet_log_agent.py`

- [ ] **Step 1: failing test 작성**

```python
import unittest

from pet_log_agent.providers import MockAgentProvider


class TestMockProvider(unittest.TestCase):
    def test_mock_provider_classifies_meal_text(self):
        provider = MockAgentProvider()

        result = provider.structure_record("오늘 밥을 조금 먹었어")

        self.assertEqual(result.category, "meal")
        self.assertEqual(result.status, "notice")
        self.assertIn("밥", result.detail)
```

- [ ] **Step 2: 테스트 실패 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: `MockAgentProvider`가 없어서 FAIL.

- [ ] **Step 3: 최소 구현 작성**

`pet_log_agent/providers.py` 생성:

```python
from __future__ import annotations

from typing import Protocol

from pet_log_agent.domain import StructuredRecordCandidate


class AgentProvider(Protocol):
    def structure_record(self, text: str) -> StructuredRecordCandidate:
        raise NotImplementedError


class MockAgentProvider:
    def structure_record(self, text: str) -> StructuredRecordCandidate:
        category = "behavior"
        title = "일상 기록"
        status = "normal"

        if any(keyword in text for keyword in ("밥", "사료", "먹")):
            category = "meal"
            title = "식사 기록"
        elif any(keyword in text for keyword in ("산책", "걸", "운동")):
            category = "walk"
            title = "산책 기록"
        elif any(keyword in text for keyword in ("배변", "변", "설사")):
            category = "stool"
            title = "배변 기록"
        elif any(keyword in text for keyword in ("병원", "약", "접종", "구토")):
            category = "medical"
            title = "건강 기록"

        if any(keyword in text for keyword in ("못", "안", "조금", "설사", "구토", "혈변")):
            status = "notice"
        if any(keyword in text for keyword in ("혈변", "호흡", "반복 구토")):
            status = "alert"

        return StructuredRecordCandidate(
            title=title,
            detail=text,
            category=category,
            status=status,
            confidence=0.72,
        )
```

- [ ] **Step 4: 테스트 통과 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: PASS.

---

## Task 3: Pipeline Components

**파일:**
- 생성: `pet_log_agent/pipeline.py`
- 수정: `tests/test_pet_log_agent.py`

- [ ] **Step 1: failing test 작성**

```python
import unittest

from pet_log_agent.domain import StructuredRecordCandidate
from pet_log_agent.pipeline import InsightAnalyzer, SuggestionComposer


class TestPipelineComponents(unittest.TestCase):
    def test_insight_analyzer_detects_repeated_notice_records(self):
        analyzer = InsightAnalyzer()
        recent_records = (
            StructuredRecordCandidate("식사 기록", "밥을 조금 먹음", "meal", "notice", 0.8),
            StructuredRecordCandidate("식사 기록", "밥을 거의 안 먹음", "meal", "notice", 0.8),
            StructuredRecordCandidate("식사 기록", "밥을 조금 먹음", "meal", "notice", 0.8),
        )

        insights = analyzer.analyze(recent_records)

        self.assertEqual(insights[0].severity, "notice")
        self.assertIn("반복", insights[0].title)


    def test_suggestion_composer_adds_hospital_guidance_for_alert(self):
        composer = SuggestionComposer()
        candidate = StructuredRecordCandidate("건강 기록", "혈변이 보여", "medical", "alert", 0.9)

        suggestions = composer.compose(candidate, ())

        self.assertTrue(any("병원" in suggestion.action for suggestion in suggestions))
```

- [ ] **Step 2: 테스트 실패 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: `InsightAnalyzer`, `SuggestionComposer`가 없어서 FAIL.

- [ ] **Step 3: 최소 구현 작성**

`pet_log_agent/pipeline.py` 생성:

```python
from __future__ import annotations

from collections import Counter

from pet_log_agent.domain import CareInsight, CareSuggestion, StructuredRecordCandidate
from pet_log_agent.providers import AgentProvider


class RecordStructurer:
    def __init__(self, provider: AgentProvider) -> None:
        self._provider = provider

    def structure(self, text: str) -> StructuredRecordCandidate:
        return self._provider.structure_record(text)


class InsightAnalyzer:
    def analyze(self, recent_records: tuple[StructuredRecordCandidate, ...]) -> tuple[CareInsight, ...]:
        noticed_categories = [
            record.category
            for record in recent_records
            if record.status in ("notice", "alert")
        ]
        counts = Counter(noticed_categories)

        insights: list[CareInsight] = []
        for category, count in counts.items():
            if count >= 3:
                insights.append(
                    CareInsight(
                        severity="notice",
                        title=f"{category} 이상 신호 반복",
                        reason=f"최근 기록에서 {category} 관련 주의 기록이 {count}회 반복되었습니다.",
                    )
                )

        if any(record.status == "alert" for record in recent_records):
            insights.append(
                CareInsight(
                    severity="alert",
                    title="위험 신호 확인",
                    reason="최근 기록에 즉시 확인이 필요한 표현이 포함되어 있습니다.",
                )
            )

        return tuple(insights)


class SuggestionComposer:
    def compose(
        self,
        candidate: StructuredRecordCandidate,
        insights: tuple[CareInsight, ...],
    ) -> tuple[CareSuggestion, ...]:
        suggestions = [
            CareSuggestion(
                title="기록 확인",
                action="자동 분류된 기록을 확인하고 필요한 내용을 보완하세요.",
            )
        ]

        if candidate.status == "notice":
            suggestions.append(
                CareSuggestion(
                    title="변화 관찰",
                    action="같은 변화가 2~3일 이어지는지 추가로 기록하세요.",
                )
            )

        if candidate.status == "alert" or any(insight.severity == "alert" for insight in insights):
            suggestions.append(
                CareSuggestion(
                    title="병원 상담",
                    action="혈변, 호흡 이상, 반복 구토 같은 위험 신호는 병원 상담을 권장합니다.",
                )
            )

        return tuple(suggestions)
```

- [ ] **Step 4: 테스트 통과 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: PASS.

---

## Task 4: Agent Orchestration

**파일:**
- 생성: `pet_log_agent/agent.py`
- 생성: `pet_log_agent/__init__.py`
- 수정: `tests/test_pet_log_agent.py`

- [ ] **Step 1: failing test 작성**

```python
import unittest

from pet_log_agent import MockAgentProvider, PetLogAgent, PetProfile, RecordInput


class TestPetLogAgentOrchestration(unittest.TestCase):
    def test_pet_log_agent_runs_full_pipeline(self):
        agent = PetLogAgent(provider=MockAgentProvider())
        pet = PetProfile(name="초코", species="dog", age_label="10개월")
        record_input = RecordInput(
            pet=pet,
            text="오늘 밥을 조금 먹고 산책은 못 했어",
            source="manual",
        )

        result = agent.handle_record(record_input, recent_records=())

        self.assertEqual(result.candidate.category, "meal")
        self.assertEqual(result.candidate.status, "notice")
        self.assertTrue(result.suggestions)
        self.assertIn("초코", result.response_text)
```

- [ ] **Step 2: 테스트 실패 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: `PetLogAgent`가 없어서 FAIL.

- [ ] **Step 3: 최소 구현 작성**

`pet_log_agent/agent.py` 생성:

```python
from __future__ import annotations

from pet_log_agent.domain import AgentResult, RecordInput, StructuredRecordCandidate
from pet_log_agent.pipeline import InsightAnalyzer, RecordStructurer, SuggestionComposer
from pet_log_agent.providers import AgentProvider


class PetLogAgent:
    def __init__(self, provider: AgentProvider) -> None:
        self._structurer = RecordStructurer(provider)
        self._insight_analyzer = InsightAnalyzer()
        self._suggestion_composer = SuggestionComposer()

    def handle_record(
        self,
        record_input: RecordInput,
        recent_records: tuple[StructuredRecordCandidate, ...],
    ) -> AgentResult:
        candidate = self._structurer.structure(record_input.text)
        context_records = recent_records + (candidate,)
        insights = self._insight_analyzer.analyze(context_records)
        suggestions = self._suggestion_composer.compose(candidate, insights)
        response_text = self._build_response(record_input, candidate, insights)

        return AgentResult(
            candidate=candidate,
            insights=insights,
            suggestions=suggestions,
            response_text=response_text,
        )

    def _build_response(
        self,
        record_input: RecordInput,
        candidate: StructuredRecordCandidate,
        insights: tuple,
    ) -> str:
        pet_name = record_input.pet.name
        if candidate.status == "alert":
            return f"{pet_name} 기록에서 위험 신호가 보여요. 상태를 단정하지 말고 병원 상담을 우선 권장합니다."
        if insights:
            return f"{pet_name}의 최근 기록에서 반복되는 변화가 보여요. 오늘 기록도 함께 확인해볼게요."
        return f"{pet_name}의 오늘 기록을 {candidate.title}로 정리했어요."
```

`pet_log_agent/__init__.py` 생성:

```python
from pet_log_agent.agent import PetLogAgent
from pet_log_agent.domain import (
    AgentResult,
    CareInsight,
    CareSuggestion,
    PetProfile,
    RecordInput,
    StructuredRecordCandidate,
)
from pet_log_agent.providers import AgentProvider, MockAgentProvider

__all__ = [
    "AgentProvider",
    "AgentResult",
    "CareInsight",
    "CareSuggestion",
    "MockAgentProvider",
    "PetLogAgent",
    "PetProfile",
    "RecordInput",
    "StructuredRecordCandidate",
]
```

- [ ] **Step 4: 테스트 통과 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: PASS.

---

## Task 5: CLI Demo

**파일:**
- 수정: `main.py`
- 수정: `tests/test_pet_log_agent.py`

- [ ] **Step 1: failing test 작성**

```python
import unittest

from main import run_demo


class TestCliDemo(unittest.TestCase):
    def test_run_demo_returns_agent_response_text(self):
        response = run_demo("오늘 밥을 조금 먹었어")

        self.assertIn("초코", response)
        self.assertIn("기록", response)
```

- [ ] **Step 2: 테스트 실패 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: `run_demo`가 없어서 FAIL.

- [ ] **Step 3: 최소 구현 작성**

`main.py` 수정:

```python
from __future__ import annotations

from pet_log_agent import MockAgentProvider, PetLogAgent, PetProfile, RecordInput


def run_demo(text: str) -> str:
    agent = PetLogAgent(provider=MockAgentProvider())
    pet = PetProfile(name="초코", species="dog", age_label="10개월", personality="겁이 많음")
    result = agent.handle_record(
        RecordInput(pet=pet, text=text, source="manual"),
        recent_records=(),
    )
    return result.response_text


def main() -> None:
    print(run_demo("오늘 밥을 조금 먹고 산책은 못 했어"))


if __name__ == "__main__":
    main()
```

- [ ] **Step 4: 테스트 통과 확인**

실행: `uv run python -m unittest tests.test_pet_log_agent -v`

기대 결과: PASS.

---

## 검증

- [ ] 전체 단위 테스트 실행:

```bash
uv run python -m unittest discover -s tests -v
```

- [ ] CLI demo 실행:

```bash
uv run python main.py
```

- [ ] 변경 파일 확인:

```bash
git status --short
```

## 자체 검토 메모

- 기획 반영: `기획.md`의 basic AI Agent 방향인 자연어 입력, 해석, 행동 제안, pet-aware response를 다룬다.
- placeholder 확인: TBD/TODO 같은 빈 구현 지시는 없다.
- 타입 일관성: 테스트에서 참조하는 public class는 이전 task 또는 같은 task에서 정의된다.
- 테스트 실행 일관성: `unittest` runner와 `unittest.TestCase` 테스트 형식을 맞춘다.
- DB 매핑 보류: `PetProfile.species`는 optional로 두고, 실제 저장소 adapter 단계에서 `breed` 또는 pet type과의 매핑을 결정한다.
- 의도적 제한: category detection은 deterministic keyword logic이며 의료 판단이 아니다. 첫 backend agent를 네트워크 의존성 없이 테스트 가능하게 만들기 위한 제한이다.

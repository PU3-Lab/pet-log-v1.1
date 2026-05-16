# Home Feed Pipeline

## 책임

`HomeFeedPipeline`은 홈 화면에 필요한 today summary, recent changes, alerts, suggestion cards를 조립한다.

## Repository 계약

`PetLogAgentResultRepository.get_latest(pet_id)`는 pet_id별 최신 `PetLogAgentResult`를 반환한다.
저장된 결과가 없는 pet_id는 `KeyError`를 발생시켜 호출부가 명시적으로 누락 상태를 처리하도록 한다.

```text
HomeFeedInput
  -> PetLogAgentResultRepository
  -> notification infrastructure 후보
  -> ScheduleRepository
  -> ProactiveQuestionAgent 후보
  -> HomeFeedComposer
  -> HomeFeedResult
```

## 화면에 제공할 정보

- 오늘 요약
- 최근 변화
- 이상 징후
- 행동 제안 카드
- 일정/리마인더
- AI가 먼저 묻는 한 줄 질문

## ProactiveQuestionAgent 후보

`기획.md`의 홈 요구에는 "AI가 먼저 질문하는 한줄 구간"이 있다. 이 책임은 단순 홈 화면 조립보다 agent 성격이 강하므로 `HomeFeedComposer` 안에 숨기기보다 별도 agent 또는 composer 계약으로 분리한다.

후속 구현 후보:

```text
PetProfile + recent records + context insights + due schedules
  -> ProactiveQuestionPolicy 또는 ProactiveQuestionProvider
  -> ProactiveQuestionResult
```

책임 범위:

- 기록 누락, 최근 변화, 예정 일정 중 하나를 기준으로 보호자에게 물어볼 한 줄 질문을 만든다.
- 질문은 기록 보완 또는 케어 확인을 유도하되 의료 판단을 단정하지 않는다.
- 홈 피드에는 최대 1개를 노출하고, 상세 대화는 `CareQuestionPipeline` 또는 기록 입력 흐름으로 연결한다.

## NotificationAgent 후보

홈과 알림 탭에는 이상 징후 알림, 행동 변화 알림, 일정 알림, 기록 누락 알림이 필요하다. 알림 후보를 저장/조회하는 구체 repository 또는 notification infrastructure는 후속 단계에서 정한다.

후속 구현 후보:

```text
PetProfile + context insights + safety notices + due schedules
  -> NotificationPolicy
  -> NotificationCandidate tuple
```

책임 범위:

- 위험 신호, 행동 변화, 일정 도래, 기록 누락을 알림 후보로 변환한다.
- 알림 저장/전송은 notification infrastructure로 분리한다.
- 같은 원인으로 중복 알림이 반복되지 않도록 source id 또는 dedupe key를 포함한다.

## 결정

- 홈 화면은 core agent 결과를 재해석하지 않는다.
- 홈 화면용 문구와 카드 조립은 `HomeFeedComposer`에 둔다.
- 선제 질문 생성과 알림 후보 생성은 composer 안에 숨기지 않고 후속 agent 계약으로 분리한다.
- 알림/일정 소스는 후속 단계에서 repository 또는 notification infrastructure로 구체화한다.

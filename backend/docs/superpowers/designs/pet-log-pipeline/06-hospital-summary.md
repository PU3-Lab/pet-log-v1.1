# Hospital Summary Pipeline

## 책임

`HospitalSummaryPipeline`은 병원 제출용 요약을 만든다. 첫 인터페이스 설계에는 포함하되 구현 우선순위는 낮춘다.

```text
HospitalSummaryInput
  -> PetProfileRepository
  -> RecordRepository
  -> HospitalReportComposer
  -> HospitalSummaryResult
```

## 포함할 정보

- 선택된 기록 목록
- 기록별 날짜/카테고리/상태
- 보호자 입력 원문 또는 요약
- 시간 흐름에 따른 증상/행동 변화 정리
- 위험 신호가 있는 경우 safety notice

## RecordSummaryAgent와의 관계

기획서의 병원 연계 범위에는 증상 요약, 변화 기록 정리, 리포트 생성이 포함된다. 따라서 병원 제출용 문구는 일반 기록 정리 기능과 완전히 별개로 만들기보다, 후속 `RecordSummaryAgent` 또는 summary composer가 만든 공통 기록 요약을 입력으로 받아 병원 제출 목적에 맞게 재구성하는 방향을 우선 검토한다.

초기 구현 순서:

1. 일반 기록 묶음을 요약하는 summary 계약을 먼저 정의한다.
2. `HospitalSummaryPipeline`은 선택된 record id를 조회하고 summary 계약을 호출한다.
3. 병원 제출용 안전 문구와 포맷만 `HospitalReportComposer`에서 별도로 다룬다.

## 결정

- 병원 제출용 문구는 일반 홈/대화 문구와 분리한다.
- 공통 기록 요약 로직을 병원 제출용 composer 안에 숨기지 않는다.
- 실제 medical report 포맷은 후속 UX/수의사 검토 이후 확정한다.

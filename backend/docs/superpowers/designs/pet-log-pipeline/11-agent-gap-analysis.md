# 기획서 재점검 기준 누락 Agent

## 기준

`기획.md`의 핵심 방향은 기록 저장이 아니라 누적 기록을 해석하고 행동 개선으로 연결하는 AI Agent다. 따라서 단순 CRUD나 화면 조립이 아니라 판단, 요약, 질문, 알림, 입력 이해가 필요한 책임을 agent 후보로 본다.

## 현재 반영된 agent

| 기획 요구 | 현재 설계 |
| --- | --- |
| 자연어 기록 입력/자동 구조화 | `RecordStructuringAgent` |
| 누적 데이터 기반 분석, 상태 변화, 기록 누락 | `ContextAnalysisAgent` |
| 이상 징후 감지 | `RiskDetectionAgent` |
| 행동 가이드/개선 방향 제안 | `SuggestionAgent` |
| 일정 기반 관리/리마인더 | `ReminderAgent` |
| 펫과 대화하는 감성 인터페이스 | `PetPersonaAgent` + `PetChatPipeline` |
| 보호자 AI 케어 질문 | `CareQuestionPipeline` + `CareAnswerProvider` |
| 기록 타임라인/검색/필터/프로필 | frontend/API/data schema 쪽 MVP 범위 |

## 누락 agent 후보

| 우선순위 | 후보 | 기획 근거 | 필요한 이유 |
| --- | --- | --- | --- |
| 1 | `RecordSummaryAgent` | 문제 행동 요약, 주간/월간 리포트, 병원 제출용 요약, 변화 기록 정리 | `ContextAnalysisAgent`는 insight를 만들지만 사람이 읽을 문장형 요약/리포트를 만들지 않는다. |
| 2 | `CauseHypothesisPolicy` | 원인 추정 | 원인 단정은 위험하므로 진단이 아닌 "가능한 맥락", "추가 확인 질문", "관찰 포인트"로 제한하는 별도 정책이 필요하다. |
| 3 | `ProactiveQuestionAgent` | 홈의 AI가 먼저 질문하는 한줄 구간, 기록 누락/최근 변화 확인 | 홈 composer가 문구를 조립하는 것과 "무엇을 먼저 물을지" 판단하는 책임은 분리해야 한다. |
| 4 | `NotificationAgent` | 이상 징후 알림, 행동 변화 알림, 일정 알림, 기록 누락 알림 | 알림 후보 생성은 push 전송과 다르며, dedupe와 안전 문구 정책이 필요하다. |
| 5 | `PhotoRecordUnderstandingAgent` | 사진 첨부 기록, 사진 인식 아이디어 | 사진에서 관찰 가능한 정보를 구조화하고 낮은 확신은 보호자 확인으로 돌리는 입력 이해 책임이 필요하다. |

## 추가 기능 gap

| 기능 | 기획 근거 | 현재 판단 |
| --- | --- | --- |
| 공동 관리 | 사용자 초대, 기록 공유, 역할 설정, 활동 기록 표시, 알림 공유 | shared care bounded context로 분리한다. 실제 초대 발송, 권한 검증, 계정 동기화가 필요하다. |
| IoT/디바이스 데이터 수집 | IoT 연동, 휴대폰 운동 데이터 수집 아이디어 | device ingestion bounded context로 분리한다. 외부 기기별 데이터 신뢰도와 산책 관련성 검증이 먼저다. |
| 병원 실제 연계 | 병원 검색, 예약, 리포트 공유/전송 | `HospitalSummaryPipeline`은 요약까지만 담당한다. 병원 검색, 예약, 공유 링크, 전송은 hospital integration context로 분리한다. |
| 커뮤니티 운영 기능 | 게시판, 댓글, 반응, 인기글 추천 | community bounded context로 분리한다. care core에는 추천 후보만 연결한다. |
| 커머스/제휴 | 사료 추천, 용품 추천, 제휴 상품, 쿠폰/구매 연결 | commerce bounded context로 분리한다. 건강 상태 기반 추천은 안전 문구와 광고/제휴 표시 정책이 필요하다. |
| 지도/위치 추천 | 산책 스팟, 애견 동반 업소, 병원 안내 | location bounded context로 분리한다. 위치 권한, 외부 지도 API, 거리 계산 정책이 필요하다. |
| 목표/미션 | 다이어트, 문제행동 개선 미션, 산책 미션 | gamification context로 분리한다. `SuggestionAgent`가 안정화된 뒤 미션 후보로 변환한다. |
| 돈 관리 | 영수증, 보험/용품 비용, 가격 비교 | expense context로 분리한다. OCR/영수증 파싱과 가격 데이터 소스가 필요하다. |
| 설정/데이터 관리 | 알림 설정, 데이터 관리, 계정 관리 | product settings/auth/data export 기능으로 분리한다. AI agent 책임은 아니다. |

## 범위 밖 또는 후순위

| 후보 | 판단 |
| --- | --- |
| `CommunityRecommendationAgent` | 커뮤니티 카테고리/글 추천은 care core 밖의 별도 bounded context로 둔다. |
| `CommerceRecommendationAgent` | 사료/용품/제휴 추천은 비즈니스 모델 단계에서 분리 설계한다. |
| `LocationRecommendationAgent` | 산책 스팟, 동반 업소, 병원 지도 추천은 위치 권한과 외부 API 설계 이후 다룬다. |
| `GoalMissionAgent` | 다이어트/문제행동 미션은 제안 agent가 안정화된 뒤 gamification context로 분리한다. |
| `ExpenseUnderstandingAgent` | 영수증/가계부는 현재 care pipeline과 직접 관련이 낮아 후순위다. |

## 추천 반영 순서

1. `RecordSummaryAgent` 계약을 먼저 고정한다.
2. 원인 추정 표현을 `CauseHypothesisPolicy` 같은 안전 정책으로 제한한다.
3. 홈 경험에 직접 노출되는 `ProactiveQuestionAgent` 계약을 추가한다.
4. `NotificationAgent`로 알림 후보 생성과 전송 책임을 분리한다.
5. 입력 채널 확장 단계에서 `PhotoRecordUnderstandingAgent`를 추가한다.
6. 공동 관리, IoT, 병원 실제 연계, 커뮤니티, 커머스, 위치, 미션, 돈 관리는 core care agent 밖에서 별도 context로 설계한다.

## 결정

- 누락 agent 후보는 먼저 concrete class와 테스트 계약으로 정의하고, 실제 교체 필요가 생길 때만 interface를 추가한다.
- 실제 LLM, vision, push provider는 infrastructure 뒤에 둔다.
- 의료 판단 단정 표현은 모든 agent에서 금지한다.
- 원인 추정은 진단이 아니라 관찰 가능한 기록 근거와 확인 질문으로 제한한다.
- 공동 관리, IoT, 병원 실제 연계, 커뮤니티, 커머스, 위치 추천, 목표 미션, 돈 관리는 core care agent 설계에 섞지 않는다.

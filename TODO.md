# 현재 진행 중인 작업 (2026-05-12)

## 완료된 주요 기능

- [x] 알림 파이프라인: NotificationPolicy + DB 기반 missing_record 저장
- [x] 쇼핑 추천 API: Naver Shopping + LLM 기반 추천 이유
- [x] 기록 입력 파이프라인: 자연어 → 구조화 → 분석 → DB 저장
- [x] 음성 STT: Whisper 기반 변환
- [x] 동물병원 추천: Google Places API 기반
- [x] 프론트엔드 연동: 실제 백엔드 API 호출 (더미 데이터 제거)

## 다음 우선순위

### 1순위: 분석 리포트 서버화
- [ ] `/api/v1/analysis/reports?pet_id=...` — 주간/월간 분석 지표 계산 서버화
- [ ] 기존 프론트엔드 로컬 계산 → 백엔드 API 호출로 전환

### 2순위: 펫 대화 & AI 제안
- [ ] `/api/v1/pet-chat/messages` — 펫 대화 메시지 저장 및 응답
- [ ] `/api/v1/suggestions` — 기록 기반 케어 제안 목록 조회

### 3순위: 커뮤니티 & 공동 관리
- [ ] `/api/v1/community/posts` — 커뮤니티 피드 조회
- [ ] `/api/v1/shared-care/members` — 공동 관리 멤버 목록

### 4순위: 성능 최적화
- [ ] 알림 후보 생성 캐싱 (30초 이내 중복 요청 방지)
- [ ] 기록/일정 조회 페이지네이션 추가
- [ ] 쇼핑 추천 결과 캐싱

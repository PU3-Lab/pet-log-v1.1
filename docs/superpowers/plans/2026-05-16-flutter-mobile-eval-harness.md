# 2026-05-16 Flutter 모바일 앱 Eval 하네스

## 목표

Pet Log Flutter 모바일 앱(iOS + Android) 개발에 eval-driven development를 적용한다. 스프린트마다 통과해야 하는 eval gate를 정의하고, 코드 그레이더로 자동 검증한다.

## 사용한 스킬

- `eval-harness`: `/Users/kyungpyokim/.claude/skills/eval-harness/SKILL.md`

## Eval 정의 파일

각 스프린트 eval은 `.claude/evals/` 에 보관된다.

| 파일 | 대상 스프린트 |
|------|--------------|
| `.claude/evals/flutter-mobile-sprint-1.md` | Foundation & Navigation |
| `.claude/evals/flutter-mobile-sprint-2.md` | 펫 프로필 & 홈 |
| `.claude/evals/flutter-mobile-sprint-3.md` | 기록 입력 & 타임라인 |
| `.claude/evals/flutter-mobile-sprint-4.md` | 분석 & AI 기능 |
| `.claude/evals/flutter-mobile-sprint-5.md` | 커뮤니티 & 일정 |
| `.claude/evals/flutter-mobile-sprint-6.md` | 병원·쇼핑·알림·설정 & 폴리쉬 |
| `.claude/evals/flutter-mobile-sprint-7.md` | 멀티 프로필 관리 |

## Eval 실행 방법

```bash
# 스프린트 완료 시 해당 eval 실행
/eval check flutter-mobile-sprint-1

# 코드 그레이더 직접 실행
cd frontend/app/mobile
flutter analyze
flutter test
flutter test integration_test/  # Sprint 6만
flutter build apk --release      # Sprint 6만
```

## Eval 타입별 설명

### Capability Eval

해당 스프린트에서 새로 구현한 기능이 동작하는지 검증한다.

- 주요 화면이 mock 데이터로 정상 렌더링됨
- 기록 저장 플로우가 텍스트/음성 모두 동작함
- 오프라인 폴백이 Hive 캐시에서 정상 동작함
- AI 챗(펫 챗, 케어 Q&A)이 mock 응답을 표시함

### Regression Eval

이전 스프린트에서 통과한 기준이 그대로 유지되는지 검증한다.

- `flutter analyze` 오류 0개 (매 스프린트 유지)
- `flutter test` 전체 통과 (매 스프린트 누적)
- 빌드 성공 (Sprint 6에서 release 빌드까지)

## 성공 기준

| 구분 | 기준 |
|------|------|
| Capability | pass@3 >= 90% |
| Regression | pass^3 = 100% |
| 단위/위젯 커버리지 | 목표 80% 이상 (자동 강제 없음 — 각 스프린트 구현 시 수동 확인) |
| 통합 테스트 (Sprint 6) | 핵심 플로우 100% |

## 검증 예정 결과

| 명령 | 스프린트 | 목표 결과 |
|------|---------|-----------|
| `flutter analyze` | 1~7 | PASS |
| `flutter test` | 1~7 | PASS |
| `flutter test integration_test/` | 6 | PASS |
| `flutter build apk --release` | 6 | PASS |
| `flutter build ios --release --no-codesign` | 6 | PASS |

## 관련 문서

- 통합 플랜: `docs/mobile/2026-05-16-flutter-mobile-plan.md`
- API 계약: `frontend/_workspace/api-contract-plan.md`
- 웹 앱 E2E 선례: `docs/superpowers/plans/2026-05-15-frontend-e2e-eval-sprint.md`

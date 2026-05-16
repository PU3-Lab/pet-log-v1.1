# EVAL DEFINITION: flutter-mobile-sprint-3

Sprint 3 — 기록 입력 & 타임라인

## Capability Evals

- [ ] 텍스트 입력 → AI 구조화 미리보기(`POST /api/v1/pet-log/records` confirm:false 페이로드) → 확인 후 저장 플로우 동작
- [ ] 음성 녹음 버튼 탭 후 WAV 파일 생성, `POST /api/v1/speech/transcriptions` mock 호출
- [ ] 타임라인 화면에서 날짜 탐색 시 해당 날짜 기록이 표시됨
- [ ] 카테고리 필터 선택 시 해당 카테고리 기록만 표시됨
- [ ] 검색어 입력 시 기록 목록이 필터링됨
- [ ] RecordCard 스와이프 → 삭제 확인 후 타임라인에서 제거됨
- [ ] Hive 캐시: 네트워크 오류 시 마지막 기록 목록이 표시됨
- [ ] 낙관적 UI: 저장 API 응답 전에 타임라인에 새 기록이 표시됨

## Regression Evals

- [ ] Sprint 1~2 통과 기준 모두 유지
- [ ] `flutter analyze` 오류 0개
- [ ] `flutter test` 전체 통과

## Code Graders

```bash
cd frontend/app/mobile

flutter analyze && echo "PASS: analyze" || { echo "FAIL: analyze"; exit 1; }
flutter test test/domain/record_repository_test.dart && echo "PASS: record_repo" || { echo "FAIL: record_repo"; exit 1; }
flutter test test/presentation/record_input_test.dart && echo "PASS: record_input" || { echo "FAIL: record_input"; exit 1; }
flutter test test/presentation/timeline_test.dart && echo "PASS: timeline" || { echo "FAIL: timeline"; exit 1; }
flutter test && echo "PASS: all tests" || { echo "FAIL: some tests"; exit 1; }
```

## Success Metrics

- Capability: pass@3 >= 90%
- Regression: pass^3 = 100%

## Expected Output

- 기록 입력(텍스트+음성) + 타임라인 전체 동작
- 모든 신규 테스트 통과

# EVAL DEFINITION: flutter-mobile-sprint-2

Sprint 2 — 펫 프로필 & 홈

## Capability Evals

- [ ] `Pet` 모델이 freezed로 생성되고 JSON 직렬화가 동작함
- [ ] `PetRepository.getPets()` 가 mock API에서 펫 목록을 반환함
- [ ] 홈 화면에 펫 이름·품종·나이가 표시됨
- [ ] 홈 화면에 오늘의 알림 미리보기 카드가 표시됨
- [ ] 홈 화면에 AI 제안 카드가 표시됨
- [ ] 펫 프로필 화면에서 이름·품종·체중 편집 후 저장이 동작함
- [ ] 사진 업로드: `image_picker` → `POST /api/v1/files` mock 호출
- [ ] 멀티 펫 전환 시 홈 화면 데이터가 선택된 펫으로 갱신됨
- [ ] Hive 캐시: 앱 재시작 후 펫 목록이 캐시에서 표시됨

## Regression Evals

- [ ] Sprint 1 통과 기준 모두 유지
- [ ] `flutter analyze` 오류 0개
- [ ] `flutter test` 전체 통과

## Code Graders

```bash
cd frontend/app/mobile

flutter analyze && echo "PASS: analyze" || { echo "FAIL: analyze"; exit 1; }
flutter test test/domain/pet_repository_test.dart && echo "PASS: pet_repo" || { echo "FAIL: pet_repo"; exit 1; }
flutter test test/presentation/home_screen_test.dart && echo "PASS: home_screen" || { echo "FAIL: home_screen"; exit 1; }
flutter test && echo "PASS: all tests" || { echo "FAIL: some tests"; exit 1; }
```

## Success Metrics

- Capability: pass@3 >= 90%
- Regression: pass^3 = 100%

## Expected Output

- 펫 프로필 CRUD 전체 동작
- 홈 화면: 프로필 카드 + 알림 미리보기 + AI 제안
- `test/domain/pet_repository_test.dart`, `test/presentation/home_screen_test.dart` 통과

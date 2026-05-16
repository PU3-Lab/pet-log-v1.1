# EVAL DEFINITION: flutter-mobile-sprint-7

Sprint 7 — 멀티 프로필 관리

## Capability Evals

- [ ] `UserProfileRepository`가 `GET /api/v1/me`를 통해 보호자 정보를 조회하고, 다중 펫 CRUD는 `GET/POST /api/v1/pets` 및 `PATCH/DELETE /api/v1/pets/{pet_id}`를 사용함
- [ ] 다중 펫 프로필 추가/편집/삭제/순서 변경이 동작함
- [ ] 펫별 프로필 사진 업로드가 `POST /api/v1/files`를 거쳐 처리됨
- [ ] `activeProfileProvider`(Riverpod StateNotifier)가 `activePetId` + `activeGuardianId` 조합을 전역 관리함
- [ ] `recordListProvider`, `insightProvider`, `suggestionProvider`, `scheduleProvider`, `petChatProvider`가 `.family(petId)` 패턴으로 구현됨
- [ ] 프로필 전환 시 `ref.invalidate` cascade가 발동하여 이전 펫 stale 데이터가 화면에 잔류하지 않음
- [ ] AppBar 또는 Drawer에 활성 프로필 스위처 위젯이 표시됨
- [ ] `NotificationPreferenceRepository`가 프로필별 알림 설정을 분리 저장함
- [ ] 공동 케어 프로필 뷰에서 보호자별 보기/편집 권한이 표시됨
- [ ] 설정 화면에 "멀티 프로필 설정" 섹션 → `ProfileSettingsScreen`으로 이동함
- [ ] `flutter analyze` 경고 0개

## Regression Evals

- [ ] `flutter analyze` 오류 0개 (빌드 내내 유지)
- [ ] `flutter test` 전체 통과 (Sprint 1~6 기존 테스트 포함)
- [ ] `flutter build apk --debug` 성공
- [ ] 기존 바텀 탭 5개 전환이 프로필 전환 후에도 정상 동작함
- [ ] 커뮤니티·로그인 화면은 프로필 전환에 영향받지 않음 (독립 동작 유지)

## Code Graders

```bash
cd frontend/app/mobile

flutter pub get && echo "PASS: pub get" || { echo "FAIL: pub get"; exit 1; }
flutter analyze && echo "PASS: analyze" || { echo "FAIL: analyze"; exit 1; }
flutter test test/domain/user_profile_repository_test.dart && echo "PASS: profile_repo" || { echo "FAIL: profile_repo"; exit 1; }
flutter test test/presentation/profile_switcher_test.dart && echo "PASS: profile_switcher" || { echo "FAIL: profile_switcher"; exit 1; }
flutter test test/presentation/active_profile_provider_test.dart && echo "PASS: provider_isolation" || { echo "FAIL: provider_isolation"; exit 1; }
flutter build apk --debug && echo "PASS: build" || { echo "FAIL: build"; exit 1; }
```

## Success Metrics

- Capability: pass@3 >= 90%
- Regression: pass^3 = 100%

## Expected Output

- `lib/domain/repositories/user_profile_repository.dart`
- `lib/presentation/providers/active_profile_provider.dart`
- `lib/presentation/providers/record_list_provider.dart` (family 패턴으로 리팩터)
- `lib/presentation/providers/insight_provider.dart` (family 패턴으로 리팩터)
- `lib/presentation/providers/suggestion_provider.dart` (family 패턴으로 리팩터)
- `lib/presentation/widgets/profile_switcher.dart`
- `lib/presentation/screens/settings/profile_settings_screen.dart`
- `test/domain/user_profile_repository_test.dart`
- `test/presentation/profile_switcher_test.dart`
- `test/presentation/active_profile_provider_test.dart`

# EVAL DEFINITION: flutter-mobile-sprint-6

Sprint 6 — 병원·쇼핑·알림·설정 & 폴리쉬

## Capability Evals

- [ ] 병원 연계 화면에서 Google Maps가 렌더링됨(mock 위치)
- [ ] 병원 검색 버튼 탭 → `POST /api/v1/hospitals/recommendations` mock → 결과 지도에 마커 표시
- [ ] 쇼핑 추천 화면에서 추천 카드가 표시됨
- [ ] 알림 화면에서 전체 알림 목록이 표시됨
- [ ] 개별 알림 탭 → 읽음 처리됨
- [ ] "모두 읽음" 탭 → 전체 읽음 처리됨
- [ ] 공동 관리 화면에서 보호자 초대 입력 → 역할 선택 동작
- [ ] 설정 화면에서 알림 토글 변경 시 설정값이 로컬 저장소(Hive)에 저장됨 (백엔드 settings API 없음 — 로컬 전용)
- [ ] 통합 테스트: 앱 시작 → 홈 표시 → 기록 입력 → 타임라인 확인 플로우 통과
- [ ] `Semantics` 레이블이 주요 버튼에 적용됨 (접근성)

## Regression Evals

- [ ] Sprint 1~5 통과 기준 모두 유지
- [ ] `flutter analyze` 오류 0개
- [ ] `flutter test` 전체 통과
- [ ] `integration_test/app_test.dart` 통과
- [ ] `integration_test/record_flow_test.dart` 통과
- [ ] `flutter build apk --release` 성공
- [ ] `flutter build ios --release --no-codesign` 성공

## Code Graders

```bash
cd frontend/app/mobile

flutter analyze && echo "PASS: analyze" || { echo "FAIL: analyze"; exit 1; }
flutter test && echo "PASS: unit/widget" || { echo "FAIL: unit/widget"; exit 1; }
flutter test integration_test/ && echo "PASS: integration" || { echo "FAIL: integration"; exit 1; }
flutter build apk --release && echo "PASS: apk release" || { echo "FAIL: apk release"; exit 1; }
flutter build ios --release --no-codesign && echo "PASS: ios release" || { echo "FAIL: ios release"; exit 1; }
```

## Success Metrics

- Capability: pass@3 >= 90%
- Regression: pass^3 = 100%
- 단위/위젯 커버리지: 80% 이상

## Expected Output

- 완성된 Full 앱 (iOS + Android 릴리즈 빌드 통과)
- 통합 테스트 전체 통과
- 접근성 기본 적용 완료

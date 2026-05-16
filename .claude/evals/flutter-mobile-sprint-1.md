# EVAL DEFINITION: flutter-mobile-sprint-1

Sprint 1 — Foundation & Navigation

## Capability Evals

- [ ] `pubspec.yaml`에 모든 의존성(riverpod, go_router, dio, hive, freezed, mockito 등)이 선언됨
- [ ] `flutter pub get` 오류 없이 완료
- [ ] `flutter create`로 생성된 프로젝트가 iOS Simulator에서 실행됨
- [ ] 바텀 탭 5개(홈/기록/타임라인/분석/더보기)가 전환됨
- [ ] GoRouter가 16개 라우트를 정상 등록함
- [ ] `AppConfig`가 `dart-define=APP_ENV`(dev/prod)와 `Platform.isAndroid`를 조합해 base URL을 결정함 — dev/iOS: `http://localhost:27893`, dev/Android: `http://10.0.2.2:27893`, prod: Azure URL
- [ ] Dio ApiClient가 `AppConfig.baseUrl`을 사용해 인스턴스 생성됨 (플랫폼 하드코딩 없음)
- [ ] AuthInterceptor가 `Authorization: Bearer` 헤더를 주입함
- [ ] `Theme`에 색상·폰트 토큰이 정의됨
- [ ] `flutter analyze` 경고 0개

## Regression Evals

- [ ] `flutter analyze` 오류 0개 (빌드 내내 유지)
- [ ] `flutter test` 전체 통과 (신규 테스트 포함)
- [ ] `flutter build apk --debug` 성공

## Code Graders

```bash
cd frontend/app/mobile

flutter pub get && echo "PASS: pub get" || { echo "FAIL: pub get"; exit 1; }
flutter analyze && echo "PASS: analyze" || { echo "FAIL: analyze"; exit 1; }
flutter test test/domain/api_client_test.dart && echo "PASS: api_client" || { echo "FAIL: api_client"; exit 1; }
flutter build apk --debug && echo "PASS: build" || { echo "FAIL: build"; exit 1; }
```

## Success Metrics

- Capability: pass@3 >= 90%
- Regression: pass^3 = 100%

## Expected Output

- `frontend/app/mobile/` 전체 Flutter 프로젝트 구조
- 바텀 탭 전환 앱 셸 (iOS Simulator + Android Emulator 실행 확인)
- `test/domain/api_client_test.dart` 단위 테스트 통과

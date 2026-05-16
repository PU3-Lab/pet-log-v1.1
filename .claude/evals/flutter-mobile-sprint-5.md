# EVAL DEFINITION: flutter-mobile-sprint-5

Sprint 5 — 커뮤니티 & 일정

## Capability Evals

- [ ] 커뮤니티 피드에서 게시글 목록이 표시됨
- [ ] 피드 필터 선택 시 해당 카테고리 게시글만 표시됨
- [ ] 게시글 탭 → 상세 화면에서 댓글 목록이 표시됨
- [ ] 댓글 입력 → 전송 → 목록에 추가됨
- [ ] 게시글 작성 화면에서 사진 첨부 후 제출이 동작함
- [ ] 일정 화면에서 일정 목록이 날짜순으로 표시됨
- [ ] D-day 배지가 남은 일수를 정확히 표시함
- [ ] 일정 완료 체크 → 완료 상태로 변경됨
- [ ] 일정 추가 → 로컬 알림이 등록됨(`flutter_local_notifications` mock)

## Regression Evals

- [ ] Sprint 1~4 통과 기준 모두 유지
- [ ] `flutter analyze` 오류 0개
- [ ] `flutter test` 전체 통과

## Code Graders

```bash
cd frontend/app/mobile

flutter analyze && echo "PASS: analyze" || { echo "FAIL: analyze"; exit 1; }
flutter test test/presentation/community_feed_test.dart && echo "PASS: community" || { echo "FAIL: community"; exit 1; }
flutter test test/presentation/schedule_test.dart && echo "PASS: schedule" || { echo "FAIL: schedule"; exit 1; }
flutter test && echo "PASS: all tests" || { echo "FAIL: some tests"; exit 1; }
```

## Success Metrics

- Capability: pass@3 >= 90%
- Regression: pass^3 = 100%

## Expected Output

- 커뮤니티 피드·상세·작성 + 일정 관리 전체 동작

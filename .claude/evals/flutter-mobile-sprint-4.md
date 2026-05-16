# EVAL DEFINITION: flutter-mobile-sprint-4

Sprint 4 — 분석 & AI 기능

## Capability Evals

- [ ] 분석 화면에서 fl_chart 체중·식사 차트가 mock 데이터로 렌더링됨
- [ ] 주간/월간 탭 전환 시 차트 데이터가 변경됨
- [ ] 이상 징후 섹션에 mock 데이터가 표시됨
- [ ] AI 제안 목록 화면에서 제안 카드가 표시됨
- [ ] 펫 챗 패널(우측 슬라이드): 메시지 전송 → `POST /api/v1/ai/pet-chat` mock → 응답 표시
- [ ] AI 케어 Q&A 패널(좌측 슬라이드): 질문 전송 → `POST /api/v1/ai/care-answer` mock → Markdown 응답 렌더링
- [ ] 병원 상담 권장 키워드(통증, 혈변 등) 감지 시 병원 연결 안내가 표시됨

## Regression Evals

- [ ] Sprint 1~3 통과 기준 모두 유지
- [ ] `flutter analyze` 오류 0개
- [ ] `flutter test` 전체 통과

## Code Graders

```bash
cd frontend/app/mobile

flutter analyze && echo "PASS: analyze" || { echo "FAIL: analyze"; exit 1; }
flutter test test/presentation/analysis_screen_test.dart && echo "PASS: analysis" || { echo "FAIL: analysis"; exit 1; }
flutter test test/presentation/chat_panel_test.dart && echo "PASS: chat" || { echo "FAIL: chat"; exit 1; }
flutter test && echo "PASS: all tests" || { echo "FAIL: some tests"; exit 1; }
```

## Success Metrics

- Capability: pass@3 >= 90%
- Regression: pass^3 = 100%

## Expected Output

- 분석 화면(차트 포함) + AI 제안 + 펫 챗 + AI 케어 Q&A 전체 동작

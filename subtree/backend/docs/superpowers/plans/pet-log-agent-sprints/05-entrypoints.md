# Sprint 5: CLI/API/STT/TTS 진입점

**목표:** 조립된 pipeline을 CLI, HTTP, 음성 입력/출력 entrypoint에서 호출할 수 있게 만든다.

## 카드 파일

| Card | 문서 | 목표 |
| --- | --- | --- |
| 5-1 | [5-1-cli-input-parser.md](cards/sprint-05/5-1-cli-input-parser.md) | CLI input parser |
| 5-2 | [5-2-cli-output-formatter.md](cards/sprint-05/5-2-cli-output-formatter.md) | CLI output formatter |
| 5-3 | [5-3-cli-demo-function.md](cards/sprint-05/5-3-cli-demo-function.md) | CLI demo function |
| 5-4 | [5-4-http-dtos.md](cards/sprint-05/5-4-http-dtos.md) | HTTP request/response DTO |
| 5-5 | [5-5-http-routes.md](cards/sprint-05/5-5-http-routes.md) | HTTP route skeleton |
| 5-6 | [5-6-entrypoint-dependency-check.md](cards/sprint-05/5-6-entrypoint-dependency-check.md) | 금지 import 검증 |
| 5-7 | [5-7-speech-dtos.md](cards/sprint-05/5-7-speech-dtos.md) | speech request/response DTO |
| 5-8 | [5-8-mock-stt-provider.md](cards/sprint-05/5-8-mock-stt-provider.md) | mock STT provider |
| 5-9 | [5-9-mock-tts-provider.md](cards/sprint-05/5-9-mock-tts-provider.md) | mock TTS provider |
| 5-10 | [5-10-voice-record-flow.md](cards/sprint-05/5-10-voice-record-flow.md) | voice record input flow |
| 5-11 | [5-11-voice-pet-chat-output.md](cards/sprint-05/5-11-voice-pet-chat-output.md) | voice pet chat output flow |

**결정 보류:** FastAPI 도입 여부는 Card 14 시작 전 결정한다.

# 세션 요약

새 Codex 세션에서 이 저장소의 이전 작업 맥락을 이어받을 때 먼저 참고한다.

## 현재 목표

`gpt-5.5`의 실제 로컬 컨텍스트 크기를 기준으로 Codex `model_auto_compact_token_limit` 값을 조정한다. 추정값이 아니라 로컬 모델 메타데이터 기준으로 판단한다.

## 확인한 로컬 사실

- 저장소: `/Users/kimkyungpyo/Workspaces/projests/pet-log`
- 활성 전역 Codex 설정: `/Users/kimkyungpyo/.codex/config.toml`
- 설정된 모델: `gpt-5.5`
- 설정된 reasoning effort: `high`
- 현재 자동 compact 설정:

```toml
model_auto_compact_token_limit = 180000
```

- `codex --version`으로 확인한 Codex CLI 버전:

```text
codex-cli 0.130.0
```

- `codex debug models`로 확인한 실제 모델 메타데이터:

```text
gpt-5.5 context_window = 272000
gpt-5.5 max_context_window = 1000000
gpt-5.5 effective_context_window_percent = 95
```

## 계산

이 로컬 `gpt-5.5` 설정에서 `180000`은 90%가 아니다.

```text
180000 / 272000 = 66.2%
```

유효 컨텍스트 기준으로 보면:

```text
272000 * 0.95 = 258400
180000 / 258400 = 69.7%
```

## 권장값

이 환경에서는 `180000`이 꽤 이른 편이다. 균형 잡힌 권장값은 다음이다.

```toml
model_auto_compact_token_limit = 220000
```

이 값의 비율은 다음과 같다.

```text
220000 / 272000 = 80.9%
220000 / 258400 = 85.1%
```

대안 값:

- `210000`: 더 안전한 값, 전체 272k 기준 약 77.2%
- `220000`: 추천 균형값
- `230000`: 더 늦은 compact, 전체 272k 기준 약 84.6%

도구 출력이 많은 작업 중에 compact가 걸릴 위험을 감수하려는 의도가 아니라면 `240000`을 크게 넘기지 않는 것이 좋다.

## 다음 단계

사용자가 권장값 적용을 원하면 `/Users/kimkyungpyo/.codex/config.toml`에서 다음 값으로 바꾼다.

```toml
model_auto_compact_token_limit = 220000
```

관련 없는 설정은 변경하지 않는다.

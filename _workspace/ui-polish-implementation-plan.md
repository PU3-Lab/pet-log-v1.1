# 핵심 3화면 UI 고도화 구현 계획

> **작업자 안내:** 이 문서는 홈, 기록 입력, 분석 리포트의 UI 고도화를 구현하기 위한 실행 계획입니다. 단계별 체크박스(`- [ ]`)를 진행 상태 추적에 사용하세요.

**목표:** Pet Log MVP의 홈, 기록 입력, 분석 리포트 화면을 AI 에이전트 중심의 생동감 있는 제품형 UI로 고도화합니다.

**아키텍처:** 데이터 흐름과 라우트 구조는 변경하지 않고, 공통 UI 컴포넌트와 CSS 모션 토큰을 확장한 뒤 3개 핵심 화면에 적용합니다. 외부 이미지 다운로드 없이 현재 SVG 아이콘 컴포넌트와 CSS 기반 장식을 사용해 정적 느낌을 줄입니다.

**기술 스택:** Next.js App Router, React, TypeScript, Tailwind CSS, CSS keyframes, Node test runner, Playwright QA

---

## 적용 범위

- 대상 화면: `/`, `/record`, `/analysis`
- 대상 공통 파일: `app/web/src/components/ui.tsx`, `app/web/src/components/pet-icons.tsx`, `app/web/src/app/globals.css`
- 제외 범위: API, 데이터 스키마, 인증, 저장 방식, 커뮤니티/병원/쇼핑/설정 화면의 개별 UI 재설계
- 기본 방향: AI 에이전트 중심, 제품형 모션, 과하지 않은 상태 피드백

## 구현 원칙

- 정보 구조는 유지하고 시각 계층, 아이콘, 모션만 강화합니다.
- 모든 모션은 `prefers-reduced-motion: reduce`에서 비활성화 또는 최소화합니다.
- 모바일 320px 너비에서 텍스트가 겹치거나 버튼 밖으로 나가지 않아야 합니다.
- 기존 테스트가 검증하는 데이터 로직과 라우트 동작은 변경하지 않습니다.
- 새 컴포넌트 props는 선택값으로 추가해 기존 호출부 호환성을 유지합니다.

## 파일 책임

- `app/web/src/components/pet-icons.tsx`: 식사, 산책, 배변, 의료, 행동, AI 상태, Sparkle, Check, Alert 계열 아이콘 이름을 추가합니다.
- `app/web/src/components/ui.tsx`: `AnimatedCard`, `MetricTile`, `AiMascot`, `CategoryBadge`, 그래프 컴포넌트의 시각 표현을 확장합니다.
- `app/web/src/app/globals.css`: 카드 등장, 부드러운 부유 효과, 상태 펄스, 그래프 드로잉, 저장 성공 피드백, reduced motion 규칙을 추가합니다.
- `app/web/src/app/page.tsx`: 홈 첫 화면의 AI 에이전트 존재감, 알림/요약/제안 카드의 아이콘과 등장 순서를 강화합니다.
- `app/web/src/app/record/page.tsx`: 빠른 입력 카테고리와 AI 구조화 미리보기의 아이콘, 선택 전환, 로딩/완료 피드백을 강화합니다.
- `app/web/src/app/analysis/page.tsx`: 분석 요약, 지표 카드, 변화 추이 그래프에 상태 아이콘과 순차 모션을 적용합니다.

## 작업 단계

### 1. 현재 상태 기준선 확인

- [ ] `app/web`에서 `npm run lint`를 실행해 시작 전 lint 상태를 확인합니다.
- [ ] `app/web`에서 `npm run typecheck`를 실행해 시작 전 타입 상태를 확인합니다.
- [ ] `app/web`에서 `npm test`를 실행해 시작 전 테스트 상태를 확인합니다.
- [ ] 현재 홈/기록/분석 모바일 스크린샷 위치인 `_workspace/qa-screenshots/home-375.png`, `_workspace/qa-screenshots/record-375.png`, `_workspace/qa-screenshots/analysis-375.png`를 비교 기준으로 둡니다.

### 2. 공통 아이콘과 모션 토큰 추가

- [ ] `PetIconProps["name"]`에 다음 이름을 추가합니다: `meal`, `walk`, `stool`, `medical`, `behavior`, `sparkle`, `check`, `alert`, `activity`.
- [ ] 각 아이콘은 기존 `PetIcon` 방식처럼 단일 path 문자열로 추가하고, stroke 기반 스타일을 유지합니다.
- [ ] `globals.css`에 다음 클래스를 추가합니다.
  - `pet-log-card-rise`: 카드가 아래에서 살짝 올라오며 나타나는 효과
  - `pet-log-float-soft`: AI 마스코트와 주요 CTA의 은은한 부유 효과
  - `pet-log-pulse-dot`: 상태 점의 부드러운 펄스 효과
  - `pet-log-pressable`: 버튼/카드 press 피드백
  - `pet-log-chart-draw`: SVG 선 드로잉 효과
- [ ] `@media (prefers-reduced-motion: reduce)`에서 위 애니메이션을 제거하고 transition 시간을 최소화합니다.
- [ ] `npm run typecheck`로 아이콘 이름 추가가 타입 오류를 만들지 않는지 확인합니다.

### 3. 공통 UI 컴포넌트 확장

- [ ] `Card`에 `motion?: "none" | "rise"`와 `interactive?: boolean` 선택 prop을 추가합니다. 기본값은 현재와 동일하게 동작해야 합니다.
- [ ] `Card`가 `motion="rise"`일 때 `pet-log-card-rise` 클래스를 붙이고, `interactive`가 true일 때 `pet-log-pressable` 클래스를 붙입니다.
- [ ] `AiMascot`을 텍스트 `AI`만 보이는 원형에서 Sparkle 아이콘과 상태 점을 가진 에이전트 배지로 고도화합니다.
- [ ] `AiMascot`은 `label?: string`, `active?: boolean` 선택 prop을 받고, 기존 호출부는 수정 없이 컴파일되어야 합니다.
- [ ] `MultiLineChart`의 선과 점에 `pet-log-chart-draw`를 적용해 분석 화면에서 변화 추이가 그려지는 느낌을 줍니다.
- [ ] `npm run lint`와 `npm run typecheck`를 실행합니다.

### 4. 홈 화면 고도화

- [ ] 프로필 카드는 기존 정보 구조를 유지하되 카드 내부에 상태 아이콘과 부드러운 배경 레이어를 추가합니다.
- [ ] `AI 질문` 카드는 `AiMascot active`를 사용하고, 질문 제목 옆에 Sparkle 아이콘을 배치합니다.
- [ ] `오늘 알림`, `오늘 요약`, `최근 변화`, `AI 제안`, `최근 기록` 카드에 `motion="rise"`를 적용합니다.
- [ ] 알림과 최근 변화의 tone 점에는 `pet-log-pulse-dot`을 적용하되, red/orange 계열만 눈에 띄게 처리합니다.
- [ ] 플로팅 `물어보기` 버튼에는 `pet-log-float-soft`와 `pet-log-pressable`을 적용합니다.
- [ ] 홈의 텍스트 문구는 기능 설명을 늘리지 않고 기존 문구를 유지합니다.
- [ ] 320px, 375px, 430px 폭에서 하단 내비와 플로팅 버튼이 겹치지 않는지 확인합니다.

### 5. 기록 입력 화면 고도화

- [ ] `categoryOptions`에 `icon` 필드를 추가하고 각 카테고리를 `PetIcon`으로 표시합니다.
- [ ] 빠른 입력 버튼은 좌측 아이콘, 우측 텍스트 구조로 바꾸고 선택된 카테고리에만 강한 배경과 check 아이콘을 표시합니다.
- [ ] 입력 방식 버튼에는 `text`, `voice`, `photo` 상태를 직접 설명하는 추가 문구를 늘리지 않고, 현재 `getInputModeFeedback` 결과만 사용합니다.
- [ ] AI 구조화 미리보기 카드에는 Sparkle 아이콘, 신뢰도 pill, 로딩 중 펄스 상태를 추가합니다.
- [ ] 저장 성공 영역에는 check 아이콘과 짧은 등장 모션을 적용합니다.
- [ ] 저장 로직, 유효성 검사, `structureRecordPreview` 호출 방식은 변경하지 않습니다.
- [ ] `npm test -- src/lib/record-input.test.ts` 대신 현재 스크립트 구조에 맞춰 `npm test`를 실행해 기록 입력 관련 테스트가 계속 통과하는지 확인합니다.

### 6. 분석 리포트 화면 고도화

- [ ] 리포트 범위 토글은 기존 `Pill`을 유지하되 선택 상태 전환이 더 부드럽게 보이도록 공통 transition만 강화합니다.
- [ ] 상단 요약 카드의 `기록`, `주의`, `지표` 타일에 각각 `record`, `alert`, `analysis` 아이콘을 추가합니다.
- [ ] `summary.cards` 지표 카드에는 tone별 아이콘과 `motion="rise"`를 적용합니다.
- [ ] `변화 추이` 카드의 그래프 선에는 `pet-log-chart-draw`를 적용하고, 범례 점은 기존 색상을 유지합니다.
- [ ] `AI 분석 결과` 카드에는 tone별 상태 아이콘을 추가하고 안전 안내 문구는 변경하지 않습니다.
- [ ] 분석 계산 함수와 리포트 데이터 생성 함수는 변경하지 않습니다.
- [ ] `npm test -- src/lib/analysis-summary.test.ts` 대신 현재 스크립트 구조에 맞춰 `npm test`를 실행해 분석 관련 테스트가 계속 통과하는지 확인합니다.

### 7. 모바일 QA와 빌드 검증

- [ ] `app/web`에서 `npm run lint`를 실행합니다.
- [ ] `app/web`에서 `npm run typecheck`를 실행합니다.
- [ ] `app/web`에서 `npm test`를 실행합니다.
- [ ] `app/web`에서 `npm run build`를 실행합니다.
- [ ] 개발 서버를 띄운 뒤 홈, 기록, 분석 화면을 320x740, 375x812, 430x932에서 확인합니다.
- [ ] 확인한 스크린샷은 기존 관례에 맞춰 `_workspace/qa-screenshots/`에 저장합니다.
- [ ] `_workspace/mobile-ui-qa-report.md`에 UI 고도화 확인 결과와 favicon 404 여부를 짧게 갱신합니다.

## 수용 기준

- 홈 첫 화면에서 AI 에이전트 카드가 프로필 카드보다 아래에 있으면서도 시각적으로 눈에 띕니다.
- 기록 입력 화면에서 카테고리 선택이 아이콘과 모션으로 즉시 인지됩니다.
- 분석 화면에서 요약 지표와 그래프가 정적인 표처럼 보이지 않고 변화 흐름을 전달합니다.
- 320px 모바일 폭에서 텍스트 겹침, 버튼 잘림, 하단 내비 충돌이 없습니다.
- `prefers-reduced-motion` 사용자는 핵심 정보와 기능을 동일하게 사용할 수 있습니다.
- lint, typecheck, test, build가 통과합니다.

## 커밋 계획

- 커밋은 사용자 승인 후 진행합니다.
- 권장 커밋 메시지: `feat: 핵심 화면 UI 모션 고도화`
- 커밋 전 `git diff`를 확인해 계획 범위 밖 파일이 포함되지 않았는지 검토합니다.

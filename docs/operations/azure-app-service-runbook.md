# Azure App Service 운영 매뉴얼

이 문서는 Pet Log 웹 앱을 Azure App Service에서 운영할 때 사용하는 기본 점검, 배포, 장애 대응 절차를 정리합니다.

## 운영 대상

- 구독: `Azure for Students`
- Resource Group: `pet-log-rg`
- App Service Plan: `pet-log-plan`
- App Service: `pet-log-kp-20260504`
- 기본 URL: `https://pet-log-kp-20260504.azurewebsites.net`
- Azure 지역: `koreacentral`
- 런타임: `NODE|22-lts`
- 시작 명령: `node server.js`
- 배포 방식: Next.js `standalone` 빌드 후 ZIP Deploy

## 사전 준비

Azure CLI 로그인 상태를 확인합니다.

```bash
az account show --query "{name:name,id:id,tenant:tenantDisplayName}" -o table
```

구독을 명시적으로 선택합니다.

```bash
az account set --subscription "Azure for Students"
```

로컬 작업 위치는 웹 앱 디렉터리입니다.

```bash
cd /Users/kimkyungpyo/Workspaces/projects/pet-log/frontend/app/web
```

## 일상 상태 점검

App Service 리소스 상태를 확인합니다.

```bash
az webapp show \
  -g pet-log-rg \
  -n pet-log-kp-20260504 \
  --query "{name:name,state:state,host:defaultHostName,enabled:enabled}" \
  -o table
```

메인 페이지 응답을 확인합니다.

```bash
curl -I https://pet-log-kp-20260504.azurewebsites.net
```

API route 응답을 확인합니다.

```bash
curl -I https://pet-log-kp-20260504.azurewebsites.net/api/v1/me
```

정상 기준:

- App Service `state`가 `Running`
- 메인 페이지가 `HTTP/2 200` 또는 `HTTP/1.1 200`
- API route가 `200`
- `content-type`이 메인 페이지는 `text/html`, API는 `application/json`

## 배포 절차

배포 전 로컬 검증을 실행합니다.

```bash
cd frontend/app/web
npm run lint
npm run typecheck
npm run build
```

Azure 배포용 ZIP만 만들 때는 다음 명령을 사용합니다.

```bash
npm run azure:package
```

생성 위치:

```text
frontend/app/web/.azure-deploy/pet-log-web.zip
```

빌드, 패키징, 시작 명령 설정, ZIP Deploy를 한 번에 실행합니다.

```bash
npm run azure:deploy -- pet-log-rg pet-log-kp-20260504 "Azure for Students"
```

### 백엔드 (FastAPI)

배포 전 로컬 검증을 실행합니다.

```bash
cd backend
uv run python -m unittest discover -s tests
```

Azure 배포용 ZIP을 생성합니다. (로컬 `.env`와 `.chroma_db`가 포함됩니다.)

```bash
bash scripts/azure-package.sh
```

생성 위치:

```text
backend/.azure-deploy/pet-log-backend.zip
```

패키징 및 배포를 실행합니다.

```bash
# 사용법: bash scripts/azure-deploy.sh <리소스그룹> <앱이름> [구독명]
bash scripts/azure-deploy.sh pet-log-rg pet-log-backend-kp "Azure for Students"
```

배포 후 다음 명령으로 헬스체크를 수행합니다.

```bash
curl -I https://pet-log-backend-kp.azurewebsites.net/health
```

배포 후 다음 명령으로 앱과 API를 확인합니다.

```bash
curl -I https://pet-log-kp-20260504.azurewebsites.net
curl -I https://pet-log-kp-20260504.azurewebsites.net/api/v1/me
```

## 로그 확인

실시간 로그를 확인합니다.

```bash
az webapp log tail \
  -g pet-log-rg \
  -n pet-log-kp-20260504
```

로그가 비활성화되어 있으면 파일 시스템 로그를 켭니다.

```bash
az webapp log config \
  -g pet-log-rg \
  -n pet-log-kp-20260504 \
  --application-logging filesystem \
  --web-server-logging filesystem \
  --level information
```

최근 배포 상태를 확인합니다.

```bash
az webapp log deployment list \
  -g pet-log-rg \
  -n pet-log-kp-20260504 \
  -o table
```

최근 배포 로그를 자세히 확인합니다.

```bash
az webapp log deployment show \
  -g pet-log-rg \
  -n pet-log-kp-20260504
```

## 재시작과 복구

앱 프로세스가 응답하지 않거나 배포 후 상태가 오래 갱신되지 않으면 App Service를 재시작합니다.

```bash
az webapp restart \
  -g pet-log-rg \
  -n pet-log-kp-20260504
```

재시작 후 상태를 확인합니다.

```bash
az webapp show -g pet-log-rg -n pet-log-kp-20260504 --query state -o tsv
curl -I https://pet-log-kp-20260504.azurewebsites.net
```

최근 배포가 문제라고 판단되면 작업 트리가 깨끗한지 확인한 뒤 마지막으로 정상 확인된 커밋에서 다시 배포합니다.

```bash
git status --short
git checkout <정상-커밋>
cd frontend/app/web
npm run azure:deploy -- pet-log-rg pet-log-kp-20260504 "Azure for Students"
```

복구 후에는 원래 작업 브랜치로 돌아옵니다.

```bash
git switch -
```

## 환경변수 관리

현재 환경변수를 따로 설정하지 않으면 AI provider는 기본값인 `mock`으로 동작합니다.

실제 OpenAI 연동을 켤 때 필요한 주요 설정:

- `PET_LOG_AI_PROVIDER=openai`
- `OPENAI_API_KEY`
- `PET_LOG_OPENAI_MODEL`
- `PET_LOG_OPENAI_RESPONSES_URL`

환경변수 조회:

```bash
az webapp config appsettings list \
  -g pet-log-rg \
  -n pet-log-kp-20260504 \
  -o table
```

환경변수 설정:

```bash
az webapp config appsettings set \
  -g pet-log-rg \
  -n pet-log-kp-20260504 \
  --settings PET_LOG_AI_PROVIDER=openai PET_LOG_OPENAI_MODEL=gpt-4o-mini
```

`OPENAI_API_KEY` 같은 비밀값은 코드나 문서에 기록하지 않고 App Service 환경변수나 별도 secret manager에만 저장합니다.

## 장애 대응 체크리스트

사이트가 열리지 않을 때:

1. `az webapp show`로 `Running` 상태인지 확인합니다.
2. `curl -I`로 메인 페이지와 API route 응답 코드를 확인합니다.
3. `az webapp log tail`로 런타임 오류를 확인합니다.
4. 시작 명령이 `node server.js`인지 확인합니다.
5. 런타임이 `NODE|22-lts`인지 확인합니다.
6. 필요하면 `az webapp restart`를 실행합니다.
7. 최근 배포 이후 발생한 문제면 정상 커밋을 다시 배포합니다.

시작 명령 확인:

```bash
az webapp config show \
  -g pet-log-rg \
  -n pet-log-kp-20260504 \
  --query "{linuxFxVersion:linuxFxVersion,appCommandLine:appCommandLine}" \
  -o table
```

시작 명령 재설정:

```bash
az webapp config set \
  -g pet-log-rg \
  -n pet-log-kp-20260504 \
  --startup-file "node server.js"
```

## 비용과 리소스 관리

현재 App Service Plan은 학생 구독과 테스트 운영을 전제로 한 최소 규모입니다. 실제 사용자 테스트를 시작하면 다음 항목을 확인합니다.

- App Service Plan SKU와 월 예상 비용
- CPU, 메모리, 응답 시간
- 로그 보관 기간
- OpenAI API 사용량과 비용
- 커스텀 도메인 및 TLS 인증서 필요 여부

리소스 목록 확인:

```bash
az resource list -g pet-log-rg -o table
```

App Service Plan 확인:

```bash
az appservice plan show \
  -g pet-log-rg \
  -n pet-log-plan \
  --query "{name:name,sku:sku.name,location:location,status:status}" \
  -o table
```

## 운영 원칙

- 배포 전 `lint`, `typecheck`, `build`를 통과시킵니다.
- 배포 후 메인 페이지와 API route를 모두 확인합니다.
- 비밀값은 코드, README, 커밋 메시지에 남기지 않습니다.
- 장애 대응 중 실행한 명령과 확인 결과는 이슈나 작업 메모에 남깁니다.
- 운영 설정을 바꾸면 README 또는 이 운영 매뉴얼을 함께 업데이트합니다.

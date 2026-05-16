FROM python:3.12-slim

# 1. 시스템 의존성 설치 (ffmpeg는 Whisper에 필수, libmagic은 파일 타입 체크)
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libmagic1 \
    gcc \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# 2. 작업 디렉토리 설정
WORKDIR /app

# 3. 의존성 파일 복사
COPY pyproject.toml uv.lock ./

# 4. uv를 사용하여 의존성 설치 (캐시 활용 및 속도 향상)
# Azure 환경에서 로컬 경로 설치 에러를 방지하기 위해 requirements 추출 시 필터링
RUN pip install --no-cache-dir uv && \
    uv export --format requirements-txt --no-dev --no-editable --no-hashes --output-file requirements_raw.txt && \
    # 로컬 프로젝트(.)와 관련된 라인 제외 (src 폴더가 아직 없어서 에러 발생 방지)
    grep -v "^-e " requirements_raw.txt | grep -v "^\." | grep -v "^backend" > requirements.txt && \
    # CPU 전용 torch 설치를 위해 인덱스 추가
    sed -i '1i --extra-index-url https://download.pytorch.org/whl/cpu' requirements.txt && \
    pip install --no-cache-dir gunicorn uvicorn && \
    pip install --no-cache-dir -r requirements.txt

# 5. 소스 코드 복사
COPY . .

# 6. PYTHONPATH 설정 (src 폴더 포함)
ENV PYTHONPATH="/app/src"

# 7. 포트 설정
ENV PORT=8000
EXPOSE 8000

# 8. 실행 명령 (Gunicorn 사용, 워커 1개로 제한하여 메모리 보호)
CMD ["sh", "-c", "gunicorn -w 1 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT"]

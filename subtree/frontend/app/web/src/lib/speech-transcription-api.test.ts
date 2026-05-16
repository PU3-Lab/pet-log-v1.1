import { strict as assert } from "node:assert";
import test from "node:test";
import axios, { type AxiosAdapter } from "axios";
import { GET, PATCH, POST } from "../app/api/v1/[...path]/route";
import { restoreEnvValue } from "./sprint-test-utils";

const nextRouteAxiosAdapter: AxiosAdapter = async (config) => {
  const url = new URL(config.url ?? "", config.baseURL ?? "http://localhost/api/v1");
  const path = url.pathname.replace(/^\/api\/v1\/?/, "").split("/").filter(Boolean);
  const method = (config.method ?? "get").toUpperCase();

  if (method !== "PATCH" && method !== "POST") {
    throw new Error(`Unsupported test route method: ${method}`);
  }

  const handler = method === "PATCH" ? PATCH : POST;
  const routeResponse = await handler(
    new Request(url, {
      body: typeof config.data === "string" ? config.data : JSON.stringify(config.data ?? {}),
      headers: { "Content-Type": "application/json" },
      method,
    }) as never,
    { params: Promise.resolve({ path }) },
  );

  return {
    config,
    data: await routeResponse.json(),
    headers: Object.fromEntries(routeResponse.headers.entries()),
    request: {},
    status: routeResponse.status,
    statusText: routeResponse.statusText,
  };
};

function createNextRouteAxiosClient() {
  return axios.create({
    adapter: nextRouteAxiosAdapter,
    baseURL: "http://localhost/api/v1",
  });
}

test("초기 기록 API는 FastAPI DB records endpoint를 호출한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.equal(
      config.url,
      "http://127.0.0.1:27893/api/v1/pet-log/records?pet_id=pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
    );
    assert.equal(config.method, "get");

    return {
      config,
      data: {
        success: true,
        data: {
          records: [],
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const { NextRequest } = await import("next/server");
    const response = await GET(new NextRequest("http://localhost/api/v1/pet-log/records") as never, {
      params: Promise.resolve({ path: ["pet-log", "records"] }),
    });
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.deepEqual(json.data.records, []);
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("초기 기록 API는 같은 batchId의 복합 카테고리 기록을 단일 카드로 조립한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.equal(
      config.url,
      "http://127.0.0.1:27893/api/v1/pet-log/records?pet_id=pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
    );

    return {
      config,
      data: {
        success: true,
        data: {
          records: [
            {
              id: "record-meal-1",
              date: "5월 9일",
              time: "08:15",
              recordedAt: "2026-05-09T08:15:23Z",
              batchId: "batch-1",
              category: "meal",
              title: "식사",
              detail: "아침 사료 45g 먹음.",
              status: "normal",
            },
            {
              id: "record-walk-1",
              date: "5월 9일",
              time: "08:15",
              recordedAt: "2026-05-09T08:15:23Z",
              batchId: "batch-1",
              category: "walk",
              title: "산책",
              detail: "산책 20분 함.",
              status: "normal",
            },
            {
              id: "record-stool-1",
              date: "5월 9일",
              time: "20:10",
              recordedAt: "2026-05-09T20:10:00Z",
              batchId: "batch-2",
              category: "stool",
              title: "배변",
              detail: "저녁 배변 1회.",
              status: "normal",
            },
          ],
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const { NextRequest } = await import("next/server");
    const response = await GET(new NextRequest("http://localhost/api/v1/pet-log/records") as never, {
      params: Promise.resolve({ path: ["pet-log", "records"] }),
    });
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.data.records.length, 2);
    assert.equal(json.data.records[0].id, "record-meal-1");
    assert.equal(json.data.records[0].categoryChoice, "all");
    assert.equal(json.data.records[0].title, "식사 · 산책");
    assert.equal(json.data.records[0].detail, "아침 사료 45g 먹음.\n산책 20분 함.");
    assert.deepEqual(json.data.records[0].structured.detectedCategories, ["meal", "walk"]);
    assert.equal(json.data.records[1].id, "record-stool-1");
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("초기 기록 API는 같은 저장 시각이어도 batchId가 다르면 조립하지 않는다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => ({
    config,
    data: {
      success: true,
      data: {
        records: [
          {
            id: "record-meal-1",
            date: "5월 9일",
            time: "08:15",
            recordedAt: "2026-05-09T08:15:23Z",
            batchId: "batch-meal",
            category: "meal",
            title: "식사",
            detail: "아침 사료 45g 먹음.",
            status: "normal",
          },
          {
            id: "record-walk-1",
            date: "5월 9일",
            time: "08:15",
            recordedAt: "2026-05-09T08:15:23Z",
            batchId: "batch-walk",
            category: "walk",
            title: "산책",
            detail: "산책 20분 함.",
            status: "normal",
          },
        ],
      },
    },
    headers: {},
    request: {},
    status: 200,
    statusText: "OK",
  })) as AxiosAdapter;

  try {
    const { NextRequest } = await import("next/server");
    const response = await GET(new NextRequest("http://localhost/api/v1/pet-log/records") as never, {
      params: Promise.resolve({ path: ["pet-log", "records"] }),
    });
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.data.records.length, 2);
    assert.equal(json.data.records[0].id, "record-meal-1");
    assert.equal(json.data.records[1].id, "record-walk-1");
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 API는 백엔드 실패 시 공통 실패 응답을 반환한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";

  axios.defaults.adapter = (async () => {
    throw new Error("Network error");
  }) as AxiosAdapter;

  try {
    const { NextRequest } = await import("next/server");
    const response = await GET(new NextRequest("http://localhost/api/v1/pet-log/records") as never, {
      params: Promise.resolve({ path: ["pet-log", "records"] }),
    });
    const json = await response.json();

    assert.equal(response.status, 502);
    assert.deepEqual(json, {
      ok: false,
      error: {
        code: "BACKEND_RECORDS_FAILED",
        message: "기록 목록을 불러오지 못했습니다.",
      },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
  }
});

test("음성 입력 API는 multipart audio를 FastAPI transcription endpoint로 프록시한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/speech/transcriptions");
    assert.equal(config.method, "post");
    assert.ok(config.data instanceof FormData);
    const forwardedAudio = config.data.get("audio");
    assert.ok(forwardedAudio instanceof File);
    assert.equal(forwardedAudio.name, "recording.webm");
    assert.equal(forwardedAudio.type, "audio/webm");

    return {
      config,
      data: {
        success: true,
        data: {
          text: "오늘 아침 사료를 먹었어",
          corrected_text: "오늘 아침 사료를 먹었어요.",
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const body = new FormData();
    body.set("audio", new File([new Uint8Array([1, 2, 3])], "recording.webm", { type: "audio/webm" }));

    const response = await POST(
      new Request("http://localhost/api/v1/speech/transcriptions", {
        body,
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["speech", "transcriptions"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json, {
      ok: true,
      data: { text: "오늘 아침 사료를 먹었어", correctedText: "오늘 아침 사료를 먹었어요." },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
  }
});

test("음성 입력 API는 교정문이 없으면 원문을 correctedText로 사용한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";

  axios.defaults.adapter = (async (config) => {
    return {
      config,
      data: { success: true, data: { text: "산책 이십 분 했어" } },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const body = new FormData();
    body.set("audio", new File([new Uint8Array([1, 2, 3])], "recording.webm", { type: "audio/webm" }));

    const response = await POST(
      new Request("http://localhost/api/v1/speech/transcriptions", {
        body,
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["speech", "transcriptions"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json, { ok: true, data: { text: "산책 이십 분 했어", correctedText: "산책 이십 분 했어" } });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
  }
});

test("음성 문장 교정 API는 텍스트를 FastAPI correction endpoint로 프록시한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/speech/text-corrections");
    assert.equal(config.method, "post");
    assert.deepEqual(JSON.parse(String(config.data)), { text: "오늘 아침 사료를 먹었어" });

    return {
      config,
      data: {
        success: true,
        data: {
          text: "오늘 아침 사료를 먹었어",
          corrected_text: "오늘 아침 사료를 먹었어요.",
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/speech/text-corrections", {
        body: JSON.stringify({ text: "오늘 아침 사료를 먹었어" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["speech", "text-corrections"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json, {
      ok: true,
      data: { text: "오늘 아침 사료를 먹었어", correctedText: "오늘 아침 사료를 먹었어요." },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
  }
});

test("음성 문장 교정 API는 백엔드에 새 endpoint가 없으면 원문으로 대체한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/speech/text-corrections");
    return {
      config,
      data: { detail: "Not Found" },
      headers: {},
      request: {},
      status: 404,
      statusText: "Not Found",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/speech/text-corrections", {
        body: JSON.stringify({ text: "오늘 아침 사료를 먹었어" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["speech", "text-corrections"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json, {
      ok: true,
      data: { text: "오늘 아침 사료를 먹었어", correctedText: "오늘 아침 사료를 먹었어" },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
  }
});

test("기록 미리보기 API는 FastAPI 기록 파이프라인을 저장 없이 호출한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/pet-log/records");
    assert.equal(config.method, "post");
    assert.equal(config.headers.get("Content-Type"), "application/json");
    assert.deepEqual(
      JSON.parse(String(config.data)),
      {
        pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
        text: "아침 사료 45g 먹고 산책 20분 했어요.",
        source: "ai_preview",
        confirm: false,
      },
    );

    return {
      config,
      data: {
        success: true,
        data: {
          candidates: [
            {
              title: "아침 식사",
              detail: "아침 사료 45g 먹고 산책 20분 했어요.",
              category: "meal",
              status: "normal",
              confidence: 0.82,
              needs_confirmation: false,
              measurements: ["45g", "20분"],
            },
          ],
          saved_records: [],
          needs_confirmation: false,
          safety_notices: [],
          suggestions: [],
          reminders: [],
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/ai/records/structure", {
        body: JSON.stringify({ detail: "아침 사료 45g 먹고 산책 20분 했어요.", fallbackCategory: "meal" }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["ai", "records", "structure"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json, {
      ok: true,
      data: {
        structured: {
          sourceText: "아침 사료 45g 먹고 산책 20분 했어요.",
          normalizedSummary: "아침 식사",
          suggestedCategory: "meal",
          confidence: 0.82,
          measurements: [{ label: "식사", value: "45g · 20분" }],
          needsConfirmation: false,
        },
      },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 미리보기 API는 전체 기본 분류를 허용하고 서버 추천 분류를 사용한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.deepEqual(
      JSON.parse(String(config.data)),
      {
        pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
        text: "아침에 밥을 천천히 먹었어",
        source: "ai_preview",
        confirm: false,
      },
    );

    return {
      config,
      data: {
        success: true,
        data: {
          candidates: [
            {
              title: "아침 식사",
              detail: "아침에 밥을 천천히 먹었어",
              category: "meal",
              status: "normal",
              confidence: 0.86,
              needs_confirmation: false,
              measurements: [],
            },
          ],
          saved_records: [],
          needs_confirmation: false,
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/ai/records/structure", {
        body: JSON.stringify({ detail: "아침에 밥을 천천히 먹었어", fallbackCategory: "all" }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["ai", "records", "structure"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.data.structured.suggestedCategory, "meal");
    assert.equal(json.data.structured.needsConfirmation, false);
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 미리보기 API는 FastAPI 복수 후보의 카테고리를 구조화 결과에 보존한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  const detail =
    "아침 사료는 평소 양의 80% 정도 먹었고, 저녁 산책은 30분 다녀왔으며, 병원 방문은 없었고, 배변은 정상 변 1회, 행동은 평소보다 조금 조용하고 몸무게는 정상";
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.deepEqual(
      JSON.parse(String(config.data)),
      {
        pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
        text: detail,
        source: "ai_preview",
        confirm: false,
      },
    );

    return {
      config,
      data: {
        success: true,
        data: {
          candidates: [
            {
              title: "아침 식사",
              detail: "아침 사료를 평소 양의 80% 정도 먹음",
              category: "meal",
              status: "normal",
              confidence: 0.9,
              needs_confirmation: false,
              measurements: ["80%"],
            },
            {
              title: "저녁 산책",
              detail: "저녁 산책을 30분 다녀옴",
              category: "walk",
              status: "normal",
              confidence: 0.9,
              needs_confirmation: false,
              measurements: ["30분"],
            },
            {
              title: "병원 방문",
              detail: "병원 방문은 없었음",
              category: "medical",
              status: "normal",
              confidence: 0.84,
              needs_confirmation: false,
              measurements: [],
            },
            {
              title: "배변",
              detail: "정상 변 1회",
              category: "stool",
              status: "normal",
              confidence: 0.91,
              needs_confirmation: false,
              measurements: ["1회"],
            },
            {
              title: "행동",
              detail: "평소보다 조금 조용함",
              category: "behavior",
              status: "notice",
              confidence: 0.82,
              needs_confirmation: false,
              measurements: [],
            },
          ],
          saved_records: [],
          needs_confirmation: false,
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/ai/records/structure", {
        body: JSON.stringify({ detail, fallbackCategory: "all" }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["ai", "records", "structure"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.data.structured.suggestedCategory, "meal");
    assert.deepEqual(json.data.structured.detectedCategories, ["meal", "walk", "medical", "stool", "behavior"]);
    assert.deepEqual(
      json.data.structured.measurements.find((measurement: { label: string }) => measurement.label === "행동"),
      { label: "행동", value: "평소보다 조금 조용함" },
    );
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 미리보기 API는 FastAPI 복수 후보의 측정값을 모두 보존한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  const detail = "오늘 꾸꾸가 10분 정도 산책하고, 배변은 세 번 했고, 사료는 10g씩 세 번 먹었어.";
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => ({
    config,
    data: {
      success: true,
      data: {
        candidates: [
          {
            title: "산책",
            detail: "10분 정도 산책함",
            category: "walk",
            status: "normal",
            confidence: 0.91,
            needs_confirmation: false,
            measurements: ["10분"],
          },
          {
            title: "배변",
            detail: "배변을 세 번 함",
            category: "stool",
            status: "normal",
            confidence: 0.9,
            needs_confirmation: false,
            measurements: ["3회"],
          },
          {
            title: "식사",
            detail: "사료를 10g씩 세 번 먹음",
            category: "meal",
            status: "normal",
            confidence: 0.9,
            needs_confirmation: false,
            measurements: ["10g씩 3회"],
          },
        ],
        saved_records: [],
        needs_confirmation: false,
      },
    },
    headers: {},
    request: {},
    status: 200,
    statusText: "OK",
  })) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/ai/records/structure", {
        body: JSON.stringify({ detail, fallbackCategory: "all" }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["ai", "records", "structure"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(
      json.data.structured.measurements.map((measurement: { value: string }) => measurement.value),
      ["10분", "3회", "10g씩 3회"],
    );
    assert.deepEqual(
      json.data.structured.measurements.map((measurement: { label: string }) => measurement.label),
      ["산책", "배변", "식사"],
    );
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 미리보기 API는 행동 후보의 정확한 행동 단어를 값으로 유지한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/pet-log/records");
    assert.equal(config.method, "post");
    assert.equal(JSON.parse(String(config.data)).text, "초인종 소리에 꾸꾸가 계속 짖었어.");

    return {
      config,
      data: {
        success: true,
        data: {
          candidates: [
            {
              title: "초인종 반응",
              detail: "초인종 소리에 계속 짖음",
              category: "behavior",
              status: "notice",
              confidence: 0.9,
              needs_confirmation: false,
              measurements: ["짖음"],
            },
          ],
          saved_records: [],
          needs_confirmation: false,
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/ai/records/structure", {
        body: JSON.stringify({ detail: "초인종 소리에 꾸꾸가 계속 짖었어.", fallbackCategory: "all" }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["ai", "records", "structure"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json.data.structured.measurements, [{ label: "행동", value: "짖음" }]);
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 미리보기 API는 백엔드 실패 시 로컬 구조화로 대체한다", async () => {
  const previousAdapter = axios.defaults.adapter;
  axios.defaults.adapter = (async () => {
    throw new Error("backend unavailable in route adapter test");
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/ai/records/structure", {
        body: JSON.stringify({ detail: "아침에 밥을 천천히 먹었어", fallbackCategory: "all" }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["ai", "records", "structure"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.deepEqual(json, {
      ok: true,
      data: {
        structured: {
          sourceText: "아침에 밥을 천천히 먹었어",
          normalizedSummary: "아침에 밥을 천천히 먹었어",
          suggestedCategory: "meal",
          detectedCategories: ["meal"],
          confidence: 0.92,
          measurements: [],
          needsConfirmation: false,
        },
      },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});

test("기록 생성 API는 FastAPI 기록 파이프라인을 확정 저장으로 호출한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/pet-log/records");
    assert.equal(config.method, "post");
    assert.equal(config.headers.get("Content-Type"), "application/json");
    assert.deepEqual(
      JSON.parse(String(config.data)),
      {
        pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
        text: "저녁 산책 20분 했어요.",
        source: "manual",
        confirm: true,
      },
    );

    return {
      config,
      data: {
        success: true,
        data: {
          candidates: [
            {
              title: "저녁 산책",
              detail: "저녁 산책 20분 했어요.",
              category: "walk",
              status: "normal",
              confidence: 0.9,
              needs_confirmation: false,
              measurements: ["20분"],
            },
          ],
          saved_records: [
            {
              id: "record-server-1",
              pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
              category: "walk",
              title: "저녁 산책",
              detail: "저녁 산책 20분 했어요.",
              status: "normal",
              recorded_at: "2026-05-09T19:30:00",
              source: "manual",
            },
          ],
          needs_confirmation: false,
          safety_notices: [],
          suggestions: [],
          reminders: [],
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/records", {
        body: JSON.stringify({ category: "walk", detail: "저녁 산책 20분 했어요." }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["records"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 201);
    assert.deepEqual(json, {
      ok: true,
      data: {
        records: [
          {
            id: "record-server-1",
            date: "5월 9일",
            time: "19:30",
            category: "walk",
            categoryChoice: "walk",
            title: "저녁 산책",
            detail: "저녁 산책 20분 했어요.",
            status: "normal",
            structured: {
              sourceText: "저녁 산책 20분 했어요.",
              normalizedSummary: "저녁 산책",
              suggestedCategory: "walk",
              confidence: 0.9,
              measurements: [{ label: "산책", value: "20분" }],
              needsConfirmation: false,
            },
          },
        ],
      },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 생성 API는 복합 문장 저장 결과를 프런트용 단일 기록 카드로 합친다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/pet-log/records");
    assert.deepEqual(
      JSON.parse(String(config.data)),
      {
        pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
        text: "아침 사료 45g 먹고 산책 20분 했어요.",
        source: "manual",
        confirm: true,
      },
    );

    return {
      config,
      data: {
        success: true,
        data: {
          candidates: [
            {
              title: "식사",
              detail: "아침 사료 45g 먹음.",
              category: "meal",
              status: "normal",
              confidence: 0.92,
              needs_confirmation: false,
              measurements: ["45g"],
            },
            {
              title: "산책",
              detail: "산책 20분 함.",
              category: "walk",
              status: "normal",
              confidence: 0.9,
              needs_confirmation: false,
              measurements: ["20분"],
            },
          ],
          saved_records: [
            {
              id: "record-meal-1",
              pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
              category: "meal",
              title: "식사",
              detail: "아침 사료 45g 먹음.",
              status: "normal",
              recorded_at: "2026-05-09T08:15:00",
              source: "manual",
            },
            {
              id: "record-walk-1",
              pet_id: "pet_01JCM7V8H9Q2K4N6R8T0A1B2C3",
              category: "walk",
              title: "산책",
              detail: "산책 20분 함.",
              status: "normal",
              recorded_at: "2026-05-09T08:15:00",
              source: "manual",
            },
          ],
          needs_confirmation: false,
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/records", {
        body: JSON.stringify({ category: "all", detail: "아침 사료 45g 먹고 산책 20분 했어요." }),
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["records"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 201);
    assert.equal(json.data.records.length, 1);
    assert.equal(json.data.records[0].id, "record-meal-1");
    assert.equal(json.data.records[0].category, "meal");
    assert.equal(json.data.records[0].categoryChoice, "all");
    assert.equal(json.data.records[0].title, "식사 · 산책");
    assert.equal(json.data.records[0].detail, "아침 사료 45g 먹고 산책 20분 했어요.");
    assert.deepEqual(json.data.records[0].structured.detectedCategories, ["meal", "walk"]);
    assert.deepEqual(
      json.data.records[0].structured.measurements.map((measurement: { value: string }) => measurement.value),
      ["45g", "20분"],
    );
    assert.deepEqual(
      json.data.records[0].structured.measurements.map((measurement: { label: string }) => measurement.label),
      ["식사", "산책"],
    );
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("기록 생성 API는 백엔드 실패 시 mock 기록으로 대체하지 않는다", async () => {
  const previousTimeout = process.env.PET_LOG_BACKEND_TIMEOUT_MS;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_TIMEOUT_MS = "1";
  axios.defaults.adapter = (async () => {
    throw new Error("backend unavailable in route adapter test");
  }) as AxiosAdapter;

  try {
    const response = await createNextRouteAxiosClient().post("/records", {
      category: "all",
      detail: "저녁 산책 30분 다녀왔어요.",
    });

    assert.equal(response.status, 502);
    assert.deepEqual(response.data, {
      ok: false,
      error: {
        code: "BACKEND_RECORD_FAILED",
        message: "기록 서버 요청을 처리하지 못했습니다.",
      },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_TIMEOUT_MS", previousTimeout);
  }
});

test("기록 수정 API는 전체 기본 분류로 다시 구조화해 추천 카테고리를 저장한다", async () => {
  const previousAdapter = axios.defaults.adapter;
  axios.defaults.adapter = (async (config) => {
    if (config.url?.includes("/api/v1/pet-log/records/r1")) {
      return {
        config,
        data: { success: true, data: { id: "r1", category: "walk", title: "산책 30분", detail: "저녁 산책 30분 다녀왔어요.", status: "normal", recorded_at: "2026-05-11T19:30:00Z" } },
        headers: {}, request: {}, status: 200, statusText: "OK",
      };
    }
    return {
      config,
      data: { success: true, data: { candidates: [{ category: "walk", title: "산책 30분" }] } },
      headers: {}, request: {}, status: 200, statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await createNextRouteAxiosClient().patch("/records/r1", {
      category: "all",
      detail: "저녁 산책 30분 다녀왔어요.",
    });
    const json = response.data;

    assert.equal(response.status, 200);
    assert.equal(json.data.record.category, "walk");
    assert.equal(json.data.record.categoryChoice, "all");
    assert.equal(json.data.record.structured.suggestedCategory, "walk");
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});

test("기록 수정 API는 AI 자동 분류가 애매하면 기존 카테고리를 유지한다", async () => {
  const previousAdapter = axios.defaults.adapter;
  axios.defaults.adapter = (async (config) => {
    if (config.url?.includes("/api/v1/pet-log/records/r2")) {
      return {
        config,
        data: { success: true, data: { id: "r2", category: "walk", title: "평소와 비슷함", detail: "오늘은 평소와 비슷했어요.", status: "normal", recorded_at: "2026-05-11T19:30:00Z" } },
        headers: {}, request: {}, status: 200, statusText: "OK",
      };
    }
    return {
      config,
      data: { success: true, data: { candidates: [{ category: "walk", title: "평소와 비슷함", needs_confirmation: true }] } },
      headers: {}, request: {}, status: 200, statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await createNextRouteAxiosClient().patch("/records/r2", {
      category: "all",
      detail: "오늘은 평소와 비슷했어요.",
    });
    const json = response.data;

    assert.equal(response.status, 200);
    assert.equal(json.data.record.category, "walk");
    assert.equal(json.data.record.categoryChoice, "all");
    assert.equal(json.data.record.structured.needsConfirmation, true);
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});

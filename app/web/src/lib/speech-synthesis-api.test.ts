import { strict as assert } from "node:assert";
import test from "node:test";
import axios, { type AxiosAdapter } from "axios";
import { POST } from "../app/api/v1/[...path]/route";
import { restoreEnvValue } from "./sprint-test-utils";

test("음성 합성 API는 text JSON을 FastAPI synthesis endpoint로 프록시하고 audio를 반환한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";

  axios.defaults.adapter = (async (config) => {
    assert.equal(config.url, "http://127.0.0.1:27893/api/v1/speech/synthesis");
    assert.equal(config.method, "post");
    assert.equal(config.headers.get("Content-Type"), "application/json");
    assert.deepEqual(JSON.parse(String(config.data)), {
      text: "주의 기록 후속 확인이 필요합니다.",
      voice: "ko-KR-InJoonNeural",
    });

    return {
      config,
      data: new Uint8Array([1, 2, 3]),
      headers: { "content-type": "audio/mpeg" },
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/speech/synthesis", {
        body: JSON.stringify({ text: "주의 기록 후속 확인이 필요합니다.", voice: "ko-KR-InJoonNeural" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["speech", "synthesis"] }) },
    );

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("content-type"), "audio/mpeg");
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array([1, 2, 3]));
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
  }
});

test("음성 합성 API는 FastAPI synthesis 실패를 공통 실패 응답으로 반환한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";

  axios.defaults.adapter = (async (config) => {
    return {
      config,
      data: { detail: "text must not be empty" },
      headers: { "content-type": "application/json" },
      request: {},
      status: 422,
      statusText: "Unprocessable Entity",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new Request("http://localhost/api/v1/speech/synthesis", {
        body: JSON.stringify({ text: "" }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["speech", "synthesis"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 422);
    assert.deepEqual(json, {
      ok: false,
      error: {
        code: "SPEECH_SYNTHESIS_FAILED",
        message: "text must not be empty",
      },
    });
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
  }
});

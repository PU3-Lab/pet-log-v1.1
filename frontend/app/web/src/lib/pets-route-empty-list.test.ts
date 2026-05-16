import { strict as assert } from "node:assert";
import test from "node:test";
import axios, { type AxiosAdapter } from "axios";
import { NextRequest } from "next/server";
import { GET, POST, PUT } from "../app/api/v1/[...path]/route";
import { restoreEnvValue } from "./sprint-test-utils";

test("pets API는 backend가 빈 목록을 반환하면 더미 pet을 만들지 않고 빈 목록을 유지한다", async () => {
  const previousBaseUrl = process.env.PET_LOG_BACKEND_API_BASE_URL;
  const previousPetId = process.env.PET_LOG_BACKEND_PET_ID;
  const previousAdapter = axios.defaults.adapter;
  process.env.PET_LOG_BACKEND_API_BASE_URL = "http://127.0.0.1:27893";
  process.env.PET_LOG_BACKEND_PET_ID = "pet-local-default";

  axios.defaults.adapter = (async (config) => {
    return {
      config,
      data: {
        success: true,
        data: {
          pets: [],
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await GET(new NextRequest("http://localhost/api/v1/pets") as never, {
      params: Promise.resolve({ path: ["pets"] }),
    });
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.deepEqual(json.data.pets, []);
  } finally {
    axios.defaults.adapter = previousAdapter;
    restoreEnvValue("PET_LOG_BACKEND_API_BASE_URL", previousBaseUrl);
    restoreEnvValue("PET_LOG_BACKEND_PET_ID", previousPetId);
  }
});

test("pets API는 이름이 비어 있으면 현재 프로필 이름으로 backend에 전달한다", async () => {
  const previousAdapter = axios.defaults.adapter;
  let requestedName = "";
  axios.defaults.adapter = (async (config) => {
    requestedName = JSON.parse(String(config.data)).name;
    return {
      config,
      data: {
        data: {
          id: "pet-created",
          name: requestedName,
        },
      },
      headers: {},
      request: {},
      status: 201,
      statusText: "Created",
    };
  }) as AxiosAdapter;

  try {
    const response = await POST(
      new NextRequest("http://localhost/api/v1/pets", {
        body: JSON.stringify({ name: "   " }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }) as never,
      { params: Promise.resolve({ path: ["pets"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 201);
    assert.equal(json.ok, true);
    assert.equal(requestedName, "코코");
    assert.equal(json.data.name, "코코");
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});

test("profile API는 이름이 비어 있으면 현재 프로필 이름으로 backend에 전달한다", async () => {
  const previousAdapter = axios.defaults.adapter;
  let requestedName = "";
  axios.defaults.adapter = (async (config) => {
    requestedName = JSON.parse(String(config.data)).name;
    return {
      config,
      data: {
        success: true,
        data: {
          id: "pet-local-default",
          name: requestedName,
          breed: "말티즈",
          notes: [],
        },
      },
      headers: {},
      request: {},
      status: 200,
      statusText: "OK",
    };
  }) as AxiosAdapter;

  try {
    const response = await PUT(
      new NextRequest("http://localhost/api/v1/profile", {
        body: JSON.stringify({ name: "", breed: "말티즈" }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      }) as never,
      { params: Promise.resolve({ path: ["profile"] }) },
    );
    const json = await response.json();

    assert.equal(response.status, 200);
    assert.equal(json.ok, true);
    assert.equal(requestedName, "코코");
    assert.equal(json.data.profile.name, "코코");
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});

test("초기 me/pets API는 backend가 응답하지 않아도 mock 상태로 fallback한다", async () => {
  const previousAdapter = axios.defaults.adapter;
  axios.defaults.adapter = (async () => {
    throw new Error("backend unavailable in route adapter test");
  }) as AxiosAdapter;

  try {
    const meResponse = await GET(new NextRequest("http://localhost/api/v1/me") as never, {
      params: Promise.resolve({ path: ["me"] }),
    });
    const petsResponse = await GET(new NextRequest("http://localhost/api/v1/pets") as never, {
      params: Promise.resolve({ path: ["pets"] }),
    });
    const meJson = await meResponse.json();
    const petsJson = await petsResponse.json();

    assert.equal(meResponse.status, 200);
    assert.equal(meJson.ok, true);
    assert.equal(typeof meJson.data.id, "string");
    assert.equal(petsResponse.status, 200);
    assert.equal(petsJson.ok, true);
    assert.equal(petsJson.data.pets.length > 0, true);
    assert.equal(typeof petsJson.data.pets[0].name, "string");
  } finally {
    axios.defaults.adapter = previousAdapter;
  }
});

import type { Page } from "@playwright/test";

type MockRecord = {
  id: string;
  time: string;
  date: string;
  recordedAt: string;
  category: MockRecordCategory;
  categoryChoice: "meal" | "walk" | "stool" | "medical" | "behavior" | "all";
  title: string;
  detail: string;
  status: "normal" | "notice" | "alert";
  structured: {
    sourceText: string;
    normalizedSummary: string;
    suggestedCategory: MockRecordCategory;
    detectedCategories: string[];
    confidence: number;
    measurements: { label: string; value: string }[];
    needsConfirmation: boolean;
  };
};

type MockApiState = {
  records: MockRecord[];
};

type MockRecordCategory = "meal" | "walk" | "stool" | "medical" | "behavior";

const mockRecordCategories = new Set<string>(["meal", "walk", "stool", "medical", "behavior"]);

const activePet = {
  id: "pet-e2e-01",
  name: "꾸꾸",
  breed: "말티즈",
  age: "3살",
  sex: "여아",
  weight: "4.2kg",
  birthday: "2023-01-15",
  personality: "산책을 좋아하고 낯선 소리에 예민해요.",
  notes: ["알러지 주의", "사료는 소량씩 자주"],
};

const defaultRecord: MockRecord = {
  id: "record-seed-01",
  time: "09:10",
  date: "5월 15일",
  recordedAt: "2026-05-15T00:10:00.000Z",
  category: "meal",
  categoryChoice: "meal",
  title: "아침 식사",
  detail: "아침 사료 40g을 잘 먹었어요.",
  status: "normal",
  structured: {
    sourceText: "아침 사료 40g을 잘 먹었어요.",
    normalizedSummary: "아침 사료 40g 섭취",
    suggestedCategory: "meal",
    detectedCategories: ["meal"],
    confidence: 0.94,
    measurements: [{ label: "사료", value: "40g" }],
    needsConfirmation: false,
  },
};

function ok(data: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify({ ok: true, data }),
  };
}

function resolveRecordCategory(fallbackCategory: string): MockRecordCategory {
  if (fallbackCategory !== "all" && mockRecordCategories.has(fallbackCategory)) {
    return fallbackCategory as MockRecordCategory;
  }

  return "meal";
}

function structuredRecord(detail: string, fallbackCategory: string) {
  const category = resolveRecordCategory(fallbackCategory);
  return {
    sourceText: detail,
    normalizedSummary: detail,
    suggestedCategory: category,
    detectedCategories: [category],
    confidence: 0.91,
    measurements: detail.includes("50g") ? [{ label: "사료", value: "50g" }] : [],
    needsConfirmation: false,
  };
}

function createRecord(detail: string, categoryChoice: MockRecord["categoryChoice"], index: number): MockRecord {
  const category = resolveRecordCategory(categoryChoice);
  const structured = structuredRecord(detail, category);

  return {
    id: `record-e2e-${index}`,
    time: "10:20",
    date: "5월 15일",
    recordedAt: "2026-05-15T01:20:00.000Z",
    category,
    categoryChoice,
    title: detail.slice(0, 24),
    detail,
    status: "normal",
    structured,
  };
}

export async function installMockPetLogApi(page: Page, initialRecords: MockRecord[] = [defaultRecord]) {
  const state: MockApiState = {
    records: [...initialRecords],
  };

  await page.route(/\/api\/v1(?:\/|$)/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname.replace(/^\/api\/v1\/?/, "").replace(/\/$/, "");
    const method = request.method();

    if (method === "GET" && path === "me") {
      await route.fulfill(ok({ id: "user-e2e", email: "e2e@example.com", name: "E2E 보호자" }));
      return;
    }

    if (method === "GET" && path === "pets") {
      await route.fulfill(ok({ pets: [activePet] }));
      return;
    }

    if (method === "GET" && path === "pet-log/records") {
      await route.fulfill(ok({ records: state.records }));
      return;
    }

    if (method === "GET" && path === "pet-log/schedules") {
      await route.fulfill(ok({ schedules: [] }));
      return;
    }

    if (method === "GET" && path === "notifications") {
      await route.fulfill(ok({ notifications: [], readNotificationIds: [] }));
      return;
    }

    if (method === "GET" && path === "ai/insights") {
      await route.fulfill(ok({ insights: [] }));
      return;
    }

    if (method === "GET" && path === "ai/suggestions") {
      await route.fulfill(ok({ suggestions: [] }));
      return;
    }

    if (method === "GET" && path === "shopping/recommendations") {
      await route.fulfill(ok({ recommendations: [] }));
      return;
    }

    if (method === "POST" && path === "ai/records/structure") {
      const body = request.postDataJSON() as { detail?: string; fallbackCategory?: string };
      await route.fulfill(ok({ structured: structuredRecord(body.detail ?? "", body.fallbackCategory ?? "all") }));
      return;
    }

    if (method === "POST" && path === "records") {
      const body = request.postDataJSON() as { detail?: string; category?: MockRecord["categoryChoice"] };
      const record = createRecord(body.detail ?? "", body.category ?? "all", state.records.length + 1);
      state.records = [record, ...state.records];
      await route.fulfill(ok({ records: [record] }, 201));
      return;
    }

    if (method === "POST" && path === "speech/synthesis") {
      await route.fulfill({
        status: 200,
        contentType: "audio/mpeg",
        body: "mock-audio",
      });
      return;
    }

    await route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ ok: false, error: { code: "NOT_MOCKED", message: `${method} ${path}` } }),
    });
  });

  return state;
}

import { strict as assert } from "node:assert";
import { existsSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("스프린트 16: 모바일 주요 라우트와 앱 아이콘 파일이 유지된다", () => {
  const routes = ["", "record", "timeline", "analysis", "suggestions", "profile", "shared-care", "hospital", "shopping", "more"];
  const routeExists = routes.every((route) => {
    const path = route ? `src/app/${route}/page.tsx` : "src/app/page.tsx";
    return existsSync(join(process.cwd(), path));
  });

  assert.equal(routeExists, true);
  assert.ok(existsSync(join(process.cwd(), "src/app/icon.svg")));
});

test("스프린트 16 엣지: 설정과 알림 라우트도 모바일 운영 화면으로 유지된다", () => {
  assert.ok(existsSync(join(process.cwd(), "src/app/settings/page.tsx")));
  assert.ok(existsSync(join(process.cwd(), "src/app/notifications/page.tsx")));
});

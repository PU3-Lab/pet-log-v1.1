import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const homePage = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");
const notificationsPage = readFileSync(resolve(process.cwd(), "src/app/notifications/page.tsx"), "utf8");

test("알림 카드의 주황/빨간 톤은 각 색상 테두리 애니메이션을 사용한다", () => {
  const borderRule = css.match(/\.pet-log-notification-alert-border\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const orangeRule = css.match(/\.pet-log-notification-alert-border-orange\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const redRule = css.match(/\.pet-log-notification-alert-border-red\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.ok(notificationsPage.includes("notificationBorderClasses"));
  assert.ok(notificationsPage.includes('"행동 변화"'));
  assert.ok(notificationsPage.includes('"행동 변화": "behavior"'));
  assert.ok(notificationsPage.includes("pet-log-notification-alert-border"));
  assert.ok(notificationsPage.includes("pet-log-notification-alert-border-orange"));
  assert.ok(notificationsPage.includes("pet-log-notification-alert-border-red"));
  assert.ok(homePage.includes("homeNotificationBorderClasses"));
  assert.ok(homePage.includes("recentChangeLinksToHospital"));
  assert.ok(homePage.includes("homeRecentChangeHospitalBorderClass"));
  assert.ok(homePage.includes('getCareActionHref(topInsight.actionHref, "/timeline")'));
  assert.ok(homePage.includes('=== "/hospital"'));
  assert.ok(homePage.includes("href={recentChangeActionHref}"));
  assert.ok(homePage.includes("pet-log-notification-alert-border-orange"));
  assert.ok(homePage.includes("pet-log-notification-alert-border-red"));
  assert.ok(borderRule.includes("conic-gradient"));
  assert.ok(borderRule.includes("pet-log-border-glide"));
  assert.ok(borderRule.includes("--pet-log-notification-border-bright"));
  assert.ok(borderRule.includes("--pet-log-notification-border-glow"));
  assert.ok(borderRule.includes("2.7s linear infinite"));
  assert.ok(borderRule.includes("border-box"));
  assert.ok(orangeRule.includes("245, 158, 11"));
  assert.ok(redRule.includes("190, 76, 60"));
});

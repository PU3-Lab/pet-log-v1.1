import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const typingIndicator = readFileSync(resolve(process.cwd(), "src/components/chat-typing-indicator.tsx"), "utf8");
const petChatDialog = readFileSync(resolve(process.cwd(), "src/components/pet-chat-dialog.tsx"), "utf8");
const askAiPanel = readFileSync(resolve(process.cwd(), "src/components/ask-ai-panel.tsx"), "utf8");
const homePage = readFileSync(resolve(process.cwd(), "src/app/page.tsx"), "utf8");

test("대화 답변 대기 상태는 말풍선 점 애니메이션을 사용한다", () => {
  const bubbleRule = css.match(/\.pet-log-typing-bubble\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  const dotRule = css.match(/\.pet-log-typing-dot\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";

  assert.ok(typingIndicator.includes("pet-log-typing-bubble"));
  assert.ok(typingIndicator.includes("pet-log-typing-dot"));
  assert.ok(typingIndicator.includes('role="status"'));
  assert.ok(typingIndicator.includes("Array.from({ length: 3 })"));
  assert.ok(bubbleRule.includes("min-height: 34px"));
  assert.ok(bubbleRule.includes("min-width: 64px"));
  assert.ok(bubbleRule.includes("margin: 4px 0 2px 8px"));
  assert.ok(bubbleRule.includes("background: #fbfdf8"));
  assert.ok(bubbleRule.includes("border-radius"));
  assert.ok(css.includes(".pet-log-typing-bubble::after"));
  assert.ok(css.includes("clip-path: polygon(100% 0, 0 38%, 100% 100%)"));
  assert.ok(dotRule.includes("height: 7px"));
  assert.ok(dotRule.includes("background: #16804b"));
  assert.ok(dotRule.includes("pet-log-typing-dot 1.15s"));
  assert.ok(css.includes("@keyframes pet-log-typing-dot"));
  assert.ok(css.includes("translateY(-2px)"));
  assert.ok(petChatDialog.includes("<ChatTypingIndicator"));
  assert.ok(petChatDialog.includes("isOpen, messages.length, notice, isSending"));
  assert.ok(askAiPanel.includes("<ChatTypingIndicator"));
  assert.ok(askAiPanel.includes("messageCount, notice, isOpen, isSending"));
  assert.ok(homePage.includes("<ChatTypingIndicator"));
  assert.ok(homePage.includes("isChatbotHistoryLoading, isChatbotOpen, isChatbotSending"));
});

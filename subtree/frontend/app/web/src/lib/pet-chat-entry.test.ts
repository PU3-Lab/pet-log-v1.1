import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

test("더보기 프로필 카드에서 펫 대화 버튼으로 진입할 수 있다", () => {
  const morePageSource = readFileSync(join(process.cwd(), "src/app/more/page.tsx"), "utf8");
  const dialogSource = readFileSync(join(process.cwd(), "src/components/pet-chat-dialog.tsx"), "utf8");
  const iconSource = readFileSync(join(process.cwd(), "src/components/pet-icons.tsx"), "utf8");

  assert.ok(morePageSource.includes("const [isPetChatOpen, setIsPetChatOpen] = useState(false);"));
  assert.ok(morePageSource.includes('const petChatName = profile.name.trim() || "꾸꾸";'));
  assert.ok(morePageSource.includes('aria-label={`${petChatName}와의 대화`'));
  assert.ok(morePageSource.includes("{petChatName}와의 대화"));
  assert.ok(morePageSource.includes("pet-log-float-soft"));
  assert.ok(morePageSource.includes("pet-log-chat-sparkle-border"));
  assert.ok(morePageSource.includes("onClick={() => setIsPetChatOpen(true)}"));
  assert.ok(morePageSource.includes("<PetChatDialog"));
  assert.ok(morePageSource.includes('name="chat"'));
  assert.ok(dialogSource.includes('aria-label="펫과 대화"'));
  assert.ok(iconSource.includes('chat: "'));
});

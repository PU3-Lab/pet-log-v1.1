import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import test from "node:test";

const communityPageSource = readFileSync(new URL("../app/community/page.tsx", import.meta.url), "utf8");
const communitySource = readFileSync(new URL("./community.ts", import.meta.url), "utf8");
const petIconsSource = readFileSync(new URL("../components/pet-icons.tsx", import.meta.url), "utf8");

test("community detail action buttons are compact and use a bookmark save icon", () => {
  assert.ok(communityPageSource.includes("inline-flex h-7 items-center gap-1 rounded-md"));
  assert.ok(communityPageSource.includes('name={savedPostIds.includes(selectedDetail.id) ? "check" : "bookmark"}'));
  assert.ok(communityPageSource.includes("<span>{selectedDetail.likes}</span>"));
  assert.equal(communityPageSource.includes("공감 {selectedDetail.likes}"), false);
  assert.equal(communityPageSource.includes('>{savedPostIds.includes(selectedDetail.id) ? "저장됨" : "저장"}'), false);
  assert.ok(communityPageSource.includes('aria-label={savedPostIds.includes(selectedDetail.id) ? "저장됨" : "저장"}'));
  assert.ok(petIconsSource.includes('| "bookmark"'));
  assert.ok(petIconsSource.includes("bookmark:"));
});

test("community detail title is below the author/action row with a horizontal divider", () => {
  const authorActionsIndex = communityPageSource.indexOf('className="mt-3 flex items-center justify-between gap-3"');
  const titleIndex = communityPageSource.indexOf('border-b border-[#e0e6da] pb-3');
  const bodyIndex = communityPageSource.indexOf("{selectedDetail.body}");

  assert.ok(authorActionsIndex > -1);
  assert.ok(titleIndex > authorActionsIndex);
  assert.ok(bodyIndex > titleIndex);
});

test("community detail action buttons sit on the right side of the author row", () => {
  const metaIndex = communityPageSource.indexOf("{selectedDetail.meta}");
  const authorIndex = communityPageSource.indexOf("{selectedDetail.authorName}");
  const actionsIndex = communityPageSource.indexOf("onClick={reactToPost}", authorIndex);
  const titleIndex = communityPageSource.indexOf("{selectedDetail.title}");

  assert.ok(metaIndex > -1);
  assert.ok(authorIndex > metaIndex);
  assert.ok(actionsIndex > authorIndex);
  assert.ok(titleIndex > authorIndex);
  assert.ok(communityPageSource.includes('className="flex min-w-0 items-center gap-2"'));
  assert.ok(communityPageSource.includes('className="flex shrink-0 items-center gap-1.5"'));
});

test("community optimistic comment append keeps newest comments at the bottom", () => {
  assert.ok(communityPageSource.includes("getCommunityPostDetail(post, [...current.commentItems, comment])"));
  assert.equal(communityPageSource.includes("getCommunityPostDetail(post, [comment, ...current.commentItems])"), false);
});

test("community composer lets authors type a nickname for post creation", () => {
  assert.ok(communityPageSource.includes("const [draftAuthorName, setDraftAuthorName]"));
  assert.ok(communityPageSource.includes("authorName: draftAuthorName"));
  assert.ok(communityPageSource.includes('placeholder="닉네임 (비우면 랜덤)"'));
});

test("community composer places nickname before the title field", () => {
  const nicknameIndex = communityPageSource.indexOf('placeholder="닉네임 (비우면 랜덤)"');
  const titleIndex = communityPageSource.indexOf('placeholder="제목"');

  assert.ok(nicknameIndex > -1);
  assert.ok(titleIndex > nicknameIndex);
});

test("community all-view clears only the feed filter and keeps the active board", () => {
  const actionIndex = communityPageSource.indexOf("전체 보기");

  assert.ok(actionIndex > -1);
  assert.ok(communityPageSource.includes("setActiveFeed(null)"));
  assert.equal(communityPageSource.includes("setActiveBoard(null);\n                    setSelectedPostId(\"\");"), false);
});

test("community list fetches posts in ten item pages", () => {
  assert.ok(communitySource.includes("export const COMMUNITY_POST_PAGE_SIZE = 10"));
  assert.ok(communityPageSource.includes("limit: COMMUNITY_POST_PAGE_SIZE"));
  assert.ok(communityPageSource.includes("offset: 0"));
  assert.ok(communityPageSource.includes("offset: posts.length"));
});

test("community summary count uses the selected board count instead of loaded page length", () => {
  assert.ok(communityPageSource.includes("summaryPostCount"));
  assert.ok(communityPageSource.includes("getCommunitySummaryPostCount(allPosts, activeBoard)"));
  assert.equal(communityPageSource.includes("{visiblePosts.length}개 글"), false);
  assert.equal(communityPageSource.includes("{postTotalCount}개 글"), false);
});

test("community feed tabs do not include a nearby tab", () => {
  assert.equal(communityPageSource.includes('"내 주변"'), false);
});

test("community hero write button sits in a bottom action row", () => {
  const feedTitleIndex = communityPageSource.indexOf("동네 보호자 피드");
  const summaryIndex = communityPageSource.indexOf("{summaryPostCount}개 글", feedTitleIndex);
  const bottomActionRowIndex = communityPageSource.indexOf('className="mt-4 flex justify-end border-t border-[#e0e6da] pt-3"', summaryIndex);
  const writeButtonIndex = communityPageSource.indexOf('{isComposerOpen ? "닫기" : "글쓰기"}', bottomActionRowIndex);

  assert.ok(feedTitleIndex > -1);
  assert.ok(summaryIndex > feedTitleIndex);
  assert.ok(bottomActionRowIndex > summaryIndex);
  assert.ok(writeButtonIndex > bottomActionRowIndex);
});

test("community hero write button fills the card action area", () => {
  const bottomActionRowIndex = communityPageSource.indexOf('className="mt-4 flex justify-end border-t border-[#e0e6da] pt-3"');
  const fullWidthButtonIndex = communityPageSource.indexOf(
    'className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#16804b] px-3 text-sm font-black text-white"',
    bottomActionRowIndex,
  );

  assert.ok(bottomActionRowIndex > -1);
  assert.ok(fullWidthButtonIndex > bottomActionRowIndex);
});

test("community composer shows board-specific location placeholder guidance", () => {
  assert.ok(communityPageSource.includes("getCommunityLocationGuide"));
  assert.ok(communityPageSource.includes("const draftLocationGuide = getCommunityLocationGuide(draftBoard)"));
  assert.ok(communityPageSource.includes("placeholder={draftLocationGuide.placeholder}"));
  assert.ok(communityPageSource.includes("{draftLocationGuide.helpText}"));
});

test("community detail renders the location box below the body only when allowed", () => {
  const bodyIndex = communityPageSource.indexOf("{selectedDetail.body}");
  const locationBoxIndex = communityPageSource.indexOf("참고 위치", bodyIndex);
  const tagsIndex = communityPageSource.indexOf("selectedDetail.tags", bodyIndex);

  assert.ok(communityPageSource.includes("shouldShowCommunityLocationBox(selectedDetail)"));
  assert.ok(locationBoxIndex > bodyIndex);
  assert.ok(tagsIndex > locationBoxIndex);
  assert.ok(communityPageSource.includes("정확한 주소가 아닌 작성자 입력 위치입니다."));
});

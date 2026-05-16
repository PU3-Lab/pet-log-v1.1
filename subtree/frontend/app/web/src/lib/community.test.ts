import { strict as assert } from "node:assert";
import test, { mock } from "node:test";
import { apiClient } from "./api-client";
import { communityComments, communityPosts } from "./mock-data";
import type { CommunityPost } from "./types";
import {
  DEFAULT_COMMUNITY_BOARD,
  DEFAULT_COMMUNITY_FEED,
  createCommunityComment,
  createCommunityPost,
  fetchCommunityPostDetail,
  fetchCommunityPosts,
  formatCommunityCreatedAt,
  getCommunityLocationGuide,
  getCommunityDefaultPosts,
  getCommunityBoardCounts,
  getCommunityPostDetail,
  getCommunityPosts,
  getCommunitySummaryPostCount,
  parseCommunityTags,
  resolveCommunityFetchQuery,
  resolveCommunitySelectedPostId,
  resolveCommunityDraftBoard,
  shouldShowCommunityLocationBox,
  submitCommunityComment,
  submitCommunityPost,
  submitCommunityReaction,
} from "./community";

const popularPosts = getCommunityPosts(communityPosts, { feed: "인기글", board: null });

assert.equal(popularPosts.length, 5);
assert.equal(popularPosts[0].id, "c1");

const boardPosts = getCommunityPosts(communityPosts, { feed: "최신글", board: "후기" });

assert.deepEqual(
  boardPosts.map((post) => post.id),
  ["c4"],
);

const detail = getCommunityPostDetail(communityPosts[0], communityComments);

assert.equal(detail.commentItems.length, 2);
assert.equal(detail.meta, "행동 고민 · 댓글 8 · 공감 26");
assert.ok(detail.body.includes("산책 시간이 줄어든 뒤"));

const newComment = createCommunityComment({
  postId: "c1",
  body: "짧은 산책을 두 번으로 나누니 도움이 됐어요.",
  createdAt: "방금",
});

assert.equal(newComment.postId, "c1");
assert.equal(newComment.authorName, "나");

const newPost = createCommunityPost({
  board: "자유게시판",
  title: "기록 습관을 어떻게 유지하세요?",
  body: "매일 같은 시간에 기록하는 팁이 궁금해요.",
  createdAt: "방금",
});

assert.equal(newPost.board, "자유게시판");
assert.equal(newPost.comments, 0);
assert.equal(newPost.likes, 0);
assert.deepEqual(newPost.feeds, ["최신글"]);

test("getCommunityBoardCounts counts all loaded posts independently from the active feed", () => {
  const latestOnlyPosts = getCommunityPosts(communityPosts, { feed: "최신글", board: null });
  const counts = getCommunityBoardCounts(communityPosts);

  assert.equal(latestOnlyPosts.filter((post) => post.board === "용품 나눔").length, 1);
  assert.equal(counts["용품 나눔"], 1);
  assert.equal(counts["행동 고민"], 1);
});

test("getCommunitySummaryPostCount matches the selected board tab count", () => {
  const posts: CommunityPost[] = [
    { ...communityPosts[0], id: "free-latest", board: "자유게시판", feeds: ["최신글"] },
    { ...communityPosts[0], id: "free-popular", board: "자유게시판", feeds: ["인기글"] },
    { ...communityPosts[0], id: "review-latest", board: "후기", feeds: ["최신글"] },
  ];

  assert.equal(getCommunityPosts(posts, { feed: "최신글", board: "자유게시판" }).length, 2);
  assert.equal(getCommunitySummaryPostCount(posts, "자유게시판"), 2);
  assert.equal(getCommunitySummaryPostCount(posts, null), 3);
});

test("getCommunityPosts treats ten likes as the popular threshold", () => {
  const posts: CommunityPost[] = [
    { ...communityPosts[0], id: "popular-at-ten", likes: 10, feeds: ["최신글"] },
    { ...communityPosts[0], id: "not-popular-yet", likes: 9, feeds: ["인기글"] },
  ];

  assert.deepEqual(
    getCommunityPosts(posts, { feed: "인기글", board: null }).map((post) => post.id),
    ["popular-at-ten"],
  );
});

test("getCommunityPosts treats latest as all posts, not only posts tagged latest", () => {
  const posts: CommunityPost[] = [
    { ...communityPosts[0], id: "latest-tagged", board: "자유게시판", feeds: ["최신글"] },
    { ...communityPosts[0], id: "popular-only", board: "자유게시판", feeds: ["인기글"] },
  ];

  assert.deepEqual(
    getCommunityPosts(posts, { feed: "최신글", board: "자유게시판" }).map((post) => post.id),
    ["latest-tagged", "popular-only"],
  );
});

test("resolveCommunityFetchQuery keeps selected filters and omits all-view feed", () => {
  assert.deepEqual(resolveCommunityFetchQuery({ feed: "인기글", board: "유기동물" }), { feed: "인기글", board: "유기동물" });
  assert.deepEqual(resolveCommunityFetchQuery({ feed: "최신글", board: "유기동물" }), { feed: "최신글", board: "유기동물" });
  assert.deepEqual(resolveCommunityFetchQuery({ feed: null, board: "유기동물" }), { board: "유기동물" });
});

test("resolveCommunityDraftBoard follows the active board when opening the composer", () => {
  assert.equal(resolveCommunityDraftBoard("행동 고민"), "행동 고민");
  assert.equal(resolveCommunityDraftBoard(null), "자유게시판");
});

test("community defaults to abandoned animals and avoids stale selected post ids", () => {
  const defaultPosts = getCommunityDefaultPosts(communityPosts);

  assert.equal(DEFAULT_COMMUNITY_BOARD, "유기동물");
  assert.equal(DEFAULT_COMMUNITY_FEED, "최신글");
  assert.deepEqual(
    defaultPosts.map((post) => post.id),
    ["c5"],
  );
  assert.equal(resolveCommunitySelectedPostId(defaultPosts, "c1"), "c5");
});

test("formatCommunityCreatedAt renders stored ISO timestamps as readable labels", () => {
  const now = new Date("2026-05-13T05:10:00.000Z");

  assert.equal(formatCommunityCreatedAt("2026-05-13T05:08:00Z", now), "2분 전");
  assert.equal(formatCommunityCreatedAt("2026-05-13T03:30:00Z", now), "오늘 12:30");
  assert.equal(formatCommunityCreatedAt("오늘 09:20", now), "오늘 09:20");
});

test("parseCommunityTags accepts hash and comma separated tags", () => {
  assert.deepEqual(parseCommunityTags("#입양 #임시보호, 동네"), ["입양", "임시보호", "동네"]);
  assert.deepEqual(parseCommunityTags(""), []);
});

test("getCommunityPostDetail uses manual location labels instead of distance labels", () => {
  const detail = getCommunityPostDetail(
    {
      ...communityPosts[0],
      board: "유기동물",
      locationLabel: "마포구 보호소 근처",
      distance: "2.4km",
    },
    [],
  );

  assert.equal(detail.meta, "유기동물 · 댓글 8 · 공감 26 · 위치 마포구 보호소 근처");
});

test("getCommunityLocationGuide gives location examples by board", () => {
  assert.equal(getCommunityLocationGuide("유기동물").placeholder, "위치 라벨 (예: 동네 보호소 공지, 마포구 보호소 근처)");
  assert.equal(getCommunityLocationGuide("용품 나눔").placeholder, "위치 라벨 (예: 동네 직거래 가능, 역삼역 근처)");
  assert.equal(getCommunityLocationGuide("자유게시판").placeholder, "위치 라벨 (선택)");
});

test("shouldShowCommunityLocationBox limits the detail box to abandoned animal and sharing posts", () => {
  assert.equal(shouldShowCommunityLocationBox({ ...communityPosts[0], board: "유기동물", locationLabel: "동네 보호소 공지" }), true);
  assert.equal(shouldShowCommunityLocationBox({ ...communityPosts[0], board: "용품 나눔", locationLabel: "동네 직거래 가능" }), true);
  assert.equal(shouldShowCommunityLocationBox({ ...communityPosts[0], board: "자유게시판", locationLabel: "동네 카페" }), false);
  assert.equal(shouldShowCommunityLocationBox({ ...communityPosts[0], board: "유기동물", locationLabel: "" }), false);
});

test("fetchCommunityPosts calls community API with filters", async () => {
  const getMock = mock.method(apiClient, "get", async () => ({
    data: { ok: true, data: { posts: communityPosts, hasMore: true, totalCount: 15 } },
  }));

  try {
    const result = await fetchCommunityPosts({ feed: "인기글", board: "행동 고민", limit: 10, offset: 10 });

    assert.deepEqual(result.posts, communityPosts);
    assert.equal(result.hasMore, true);
    assert.equal(result.totalCount, 15);
    assert.equal(getMock.mock.callCount(), 1);
    assert.equal(getMock.mock.calls[0].arguments[0], "/community/posts");
    assert.deepEqual((getMock.mock.calls[0].arguments[1] as { params: object }).params, {
      feed: "인기글",
      board: "행동 고민",
      limit: 10,
      offset: 10,
    });
  } finally {
    getMock.mock.restore();
  }
});

test("fetchCommunityPosts can request every community post for board counts", async () => {
  const getMock = mock.method(apiClient, "get", async () => ({
    data: { ok: true, data: { posts: communityPosts, totalCount: communityPosts.length } },
  }));

  try {
    const result = await fetchCommunityPosts();

    assert.deepEqual(result.posts, communityPosts);
    assert.equal(getMock.mock.calls[0].arguments[0], "/community/posts");
    assert.deepEqual((getMock.mock.calls[0].arguments[1] as { params: object }).params, {});
  } finally {
    getMock.mock.restore();
  }
});

test("fetchCommunityPostDetail calls community detail API", async () => {
  const detail = getCommunityPostDetail(communityPosts[0], communityComments);
  const getMock = mock.method(apiClient, "get", async () => ({
    data: { ok: true, data: { post: detail } },
  }));

  try {
    const result = await fetchCommunityPostDetail("c1");

    assert.deepEqual(result.post, detail);
    assert.equal(getMock.mock.calls[0].arguments[0], "/community/posts/c1");
  } finally {
    getMock.mock.restore();
  }
});

test("submitCommunityPost sends post draft to community API", async () => {
  const postMock = mock.method(apiClient, "post", async () => ({
    data: { ok: true, data: { post: communityPosts[0] } },
  }));

  try {
    const result = await submitCommunityPost({
      board: "자유게시판",
      title: "새 글",
      body: "본문입니다.",
      authorName: "희망찬 낙타",
      tags: ["입양", "임시보호"],
      locationLabel: "마포구 보호소 근처",
    });

    assert.deepEqual(result.post, communityPosts[0]);
    assert.equal(postMock.mock.calls[0].arguments[0], "/community/posts");
    assert.deepEqual(postMock.mock.calls[0].arguments[1], {
      board: "자유게시판",
      title: "새 글",
      body: "본문입니다.",
      authorName: "희망찬 낙타",
      tags: ["입양", "임시보호"],
      locationLabel: "마포구 보호소 근처",
    });
  } finally {
    postMock.mock.restore();
  }
});

test("submitCommunityComment sends comment draft to community API", async () => {
  const detail = getCommunityPostDetail(communityPosts[0], communityComments);
  const postMock = mock.method(apiClient, "post", async () => ({
    data: { ok: true, data: { comment: communityComments[0], post: detail } },
  }));

  try {
    const result = await submitCommunityComment({ postId: "c1", body: "좋아요." });

    assert.deepEqual(result.comment, communityComments[0]);
    assert.deepEqual(result.post, detail);
    assert.equal(postMock.mock.calls[0].arguments[0], "/community/posts/c1/comments");
    assert.deepEqual(postMock.mock.calls[0].arguments[1], { body: "좋아요." });
  } finally {
    postMock.mock.restore();
  }
});

test("submitCommunityReaction increments sympathy count through community API", async () => {
  const reactedPost = { ...communityPosts[0], likes: communityPosts[0].likes + 1 };
  const postMock = mock.method(apiClient, "post", async () => ({
    data: { ok: true, data: { post: reactedPost } },
  }));

  try {
    const result = await submitCommunityReaction("c1");

    assert.deepEqual(result.post, reactedPost);
    assert.equal(postMock.mock.calls[0].arguments[0], "/community/posts/c1/reactions");
    assert.equal(postMock.mock.calls[0].arguments[1], undefined);
  } finally {
    postMock.mock.restore();
  }
});
